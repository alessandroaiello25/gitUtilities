const azureDevOps = require('azure-devops-node-api');
const { WorkItemExpand } = require("azure-devops-node-api/interfaces/WorkItemTrackingInterfaces");
const fs = require('fs');
const readline = require('readline'); // We'll still create and close an interface even though we won't prompt

// Create a readline interface (not used interactively now)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const debug = false;

/**
 * Extracts work item IDs from a given string.
 * @param {string} input
 * @returns {string[]} An array of work item IDs as strings.
 */
function extractWorkItemIds(input) {
  const matches = input.match(/#\d+/g);
  return matches ? matches.map(id => id.replace('#', '')) : [];
}

/**
 * Extracts the branch name from a URL.
 * Assumes the URL contains the separator "/GB".
 * @param {string} url
 * @returns {string} The branch name.
 */
function estraiNomeBranch(url) {
  const urlDecodificato = decodeURIComponent(url);
  const separatore = "/GB";
  const indiceSeparatore = urlDecodificato.indexOf(separatore);
  if (indiceSeparatore === -1) {
    throw new Error("Separator '/GB' not found in URL.");
  }
  return urlDecodificato.substring(indiceSeparatore + separatore.length);
}

/**
 * Retrieves work item details for the given work item ID (prId) from Azure DevOps,
 * extracts branch names from its relations (and from additional WIs found in its description),
 * and builds the following mappings:
 *    - wiToBranch: { [workItemId]: [branchName, ...] }
 *    - branchToWI: { [branchName]: workItemId }
 * Also returns a deduplicated list of branch names.
 *
 * @param {string} prId - The primary work item ID.
 * @param {Array} data - Array of credential settings (using data[0] for PAT and organization URL).
 * @returns {Promise<{ wiToBranch: Object, branchToWI: Object, branches: string[] }>}
 */
async function getWorkItemsByStatus(prId, data) {
  // Retrieve settings from credential data.
  const personalAccessToken = data[0].decrypted_pat;
  const organizationUrl = data[0].azure_org_url;
  if (!personalAccessToken || !organizationUrl) {
    console.error('ERROR RETRIEVING SETTINGS');
    return;
  }
  
  const authHandler = azureDevOps.getPersonalAccessTokenHandler(personalAccessToken);
  const connection = new azureDevOps.WebApi(organizationUrl, authHandler);
  const workItemTrackingApi = await connection.getWorkItemTrackingApi();
  
  // Build the query.
  let query = `
        SELECT [System.Id], [System.Title], [System.State], [System.Description]
        FROM WorkItems
  `;
  if (debug) {
    query += '\n WHERE [System.AssignedTo]=@Me';
  } else {
    query += `\nWHERE [System.Id]='${prId}'`;
  }
  
  // Get the primary work item with expanded relations.
  const queryResult = await workItemTrackingApi.getWorkItems([prId], undefined, undefined, WorkItemExpand.Relations);
  
  // Extract additional work item IDs from the primary WI description.
  let workItemIds = queryResult.map(item => {
    if (item.fields && item.fields['System.Description']) {
      return extractWorkItemIds(item.fields['System.Description']);
    }
    return [];
  });
  workItemIds = workItemIds.flat();
  
  // Initialize mappings.
  let wiToBranch = {};
  let branchToWI = {};
  let allBranches = [];
  
  // Process additional work items (if any).
  if (workItemIds.length > 0) {
    const additionalWIs = await workItemTrackingApi.getWorkItems(workItemIds, undefined, undefined, WorkItemExpand.Relations);
    for (let workItem of additionalWIs) {
      const wiId = workItem.id.toString();
      if (workItem.relations) {
        let branchesSet = new Set();
        workItem.relations.forEach(relation => {
          if (relation.rel === 'ArtifactLink' && relation.attributes && relation.attributes.name && relation.attributes.name.includes('Branch')) {
            try {
              const branchName = estraiNomeBranch(relation.url);
              branchesSet.add(branchName);
            } catch (e) {
              console.error('Error extracting branch name:', e);
            }
          }
        });
        if (branchesSet.size > 0) {
          wiToBranch[wiId] = Array.from(branchesSet);
          allBranches = allBranches.concat(Array.from(branchesSet));
          // Build the inverse mapping: if a branch appears more than once, the later one overwrites.
          Array.from(branchesSet).forEach(branchName => {
            branchToWI[branchName] = wiId;
          });
        }
      }
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
    if (primaryBranches.size > 0) {
      wiToBranch[wiId] = Array.from(primaryBranches);
      allBranches = allBranches.concat(Array.from(primaryBranches));
      Array.from(primaryBranches).forEach(branchName => {
        branchToWI[branchName] = wiId;
      });
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
}

module.exports = {
  getWorkItemsByStatus
};
