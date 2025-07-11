const azureDevOps = require('azure-devops-node-api')
const { WorkItemExpand } = require("azure-devops-node-api/interfaces/WorkItemTrackingInterfaces");

const fs = require('fs')

const debug = false

var organizationUrl = '';
var personalAccessToken = '';

const readline = require('readline');
// Creiamo un'interfaccia per leggere l'input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function extractWorkItemIds(input) {
    // Use a regular expression to match all IDs starting with #
    const matches = input.match(/#\d+/g);
    // Remove the # and return the cleaned IDs
    return matches ? matches.map(id => id.replace('#', '')) : [];
}

async function getWorkItemsByStatus(prId,data) {

    personalAccessToken = data[0].decrypted_pat
    organizationUrl = data[0].azure_org_url

    if(!personalAccessToken || !organizationUrl){
        console.error('ERROR RETRIEVING SETTINGS')
        return
    }

    const authHandler = azureDevOps.getPersonalAccessTokenHandler(personalAccessToken);
    const connection = new azureDevOps.WebApi(organizationUrl, authHandler);

    const workItemTrackingApi = await connection.getWorkItemTrackingApi();

    let query = `
        SELECT [System.Id], [System.Title], [System.State], [System.Description]
        FROM WorkItems
    `;

    if(debug){
        query += '\n WHERE [System.AssignedTo]=@Me'
    } else {
        query += `\nWHERE [System.Id]='${prId}'`
    }

    const queryResult = await workItemTrackingApi.getWorkItems([prId], undefined, undefined, WorkItemExpand.Relations) // Expand to include relations)

    var branchRes

    let workItemIds = queryResult.map((item) => {
        if(item.relations){
            item.relations.forEach(relation => {
                if (relation.rel === 'ArtifactLink' && relation.attributes.name.includes('Branch')) {
                    branchRes = estraiNomeBranch(relation.url)
                }
            });
        }
        return extractWorkItemIds(item.fields['System.Description'])
    });

    workItemIds = workItemIds.flat()

    let relations = []
    let witoBranch = {}

    if (workItemIds.length > 0) {
        const workItems = await workItemTrackingApi.getWorkItems(workItemIds, undefined, undefined, WorkItemExpand.Relations) // Expand to include relations)

        for(let workItem of workItems){
            if (workItem.relations) {
                var brs = new Set()
                workItem.relations.forEach((relation) => {
                    if (relation.rel === 'ArtifactLink' && relation.attributes.name.includes('Branch')) {
                        const branch = estraiNomeBranch(relation.url)
                        brs.add(branch)
                    }
                });

                if(brs.size>1){

                   await chooseBranch(workItem,brs,relations,witoBranch)

                   
                } else {
                    relations.push([...brs][0])
                    witoBranch[[...brs][0]] = workItem.id 
                }
            }
        }

    } else {
        console.log('No Work Items found with the specified status.');
    }
  }
  
  /* // Also process the primary work item.
  if (queryResult.length > 0) {
    const primaryWI = queryResult[0];
    const wiId = primaryWI.id.toString();
    let primaryBranches = new Set();
    if (primaryWI.relations) {
      primaryWI.relations.forEach(relation => {
        if (relation.rel === 'ArtifactLink' && relation.attributes && relation.attributes.name && relation.attributes.name.includes('Branch')) {
          try {
            const branchName = estraiNomeBranch(relation.url);
            primaryBranches.add(branchName);
          } catch (e) {
            console.error('Error extracting branch name:', e);
          }
        }
      });
    }

    if(Object.keys(witoBranch).length!=0){
        fs.writeFileSync(__dirname+'/branch2wi.json',JSON.stringify(witoBranch),'utf-8')
    }
  } */
  
  // Deduplicate branch names.
  const dedupedBranches = Array.from(new Set(allBranches));
  
  // Optionally, write to files (if needed by your process).
  if (dedupedBranches.length > 0) {
    fs.writeFileSync(__dirname + '/branches', dedupedBranches.join('\n'), 'utf-8');
  }
  if (Object.keys(branchToWI).length !== 0) {
    fs.writeFileSync(__dirname + '/branch2wi.json', JSON.stringify(branchToWI), 'utf-8');
  }
  
  rl.close(); // Close the readline interface since we are not prompting interactively
  
  return { wiToBranch, branchToWI, branches: dedupedBranches };

// Funzione per chiedere l'input con una Promise
function askQuestion(query) {
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            resolve(answer);
        });
    });
}

// Funzione principale per gestire il ciclo
async function chooseBranch(workItem, brs, relations,witoBranch) {
    
    let answer = null;

    // Ciclo per richiedere un input valido
    while (!answer || !brs.has(answer)) {
        if (answer) {
            console.error('WRONG BRANCH ' + answer);
        }

        const question = `The WI ${workItem.id} has ${brs.size} associated branches, which one do you wanna choose? ${[...brs].join(', ')} `;
        answer = await askQuestion(question); // Aspetta l'input dell'utente

        relations.push(answer)
        witoBranch[answer] = workItem.id 

    }

    console.log('Branch scelto: ' + answer);
}

function estraiNomeBranch(url) {
    // Decodifica l'URL
    const urlDecodificato = decodeURIComponent(url);
  
    // Cerca la posizione del separatore "%2FGB"
    const separatore = "/GB";
    const indiceSeparatore = urlDecodificato.indexOf(separatore);
  
    if (indiceSeparatore === -1) {
      // Se il separatore non esiste, restituisce un messaggio di errore
      throw new Error("Separatore '%2FGB' non trovato nell'URL.");
    }
  
    // Estrae il nome del branch
    const nomeBranch = urlDecodificato.substring(indiceSeparatore + separatore.length);
  
    return nomeBranch; // Restituisce il nome del branch
}
module.exports = {
    getWorkItemsByStatus
}
