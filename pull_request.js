const axios = require('axios');
const readline = require('readline');
const fs = require('fs')
const { exec } = require('child_process');
const execSync = require('child_process').execSync;

var AZURE_ORG_URL = ""; // Replace with your organization URL
var PROJECT = ""; // Replace with your project name
var REPOSITORY = ""; // Replace with your repository name
var PAT = ""; // Replace with your PAT

var branches = []

var tBranch2WI = {}

if(fs.existsSync(__dirname+'/branches')){
    branches = fs.readFileSync(__dirname+'/branches','utf-8').split('\n') // List of branches
} else {
    console.error('CANNOT FIND BRANCHES TO MANAGE')
    return
}

var branch2wi = {}

if(fs.existsSync(__dirname+'/branch2wi.json')){
    branch2wi = JSON.parse(fs.readFileSync(__dirname+'/branch2wi.json','utf-8'))
}

let TARGET_BRANCH = "PROD_RELEASE_"+getTodayTag(); // Replace with your target branch

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to get today's date in ddmmyyyy format
function getTodayTag() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}${month}${year}`;
}

function isList(element) {
    return Array.isArray(element);
}
  

async function createPullRequest(branch) {
    
    const url = `${AZURE_ORG_URL}/${PROJECT}/_apis/git/repositories/${REPOSITORY}/pullrequests?api-version=7.1-preview.1`;

    const auth = Buffer.from(`:${PAT}`).toString('base64');

    let workItemRefs = []

    if(branch2wi[branch]){
        if(!isList(branch2wi[branch])){
            workItemRefs.push({
                id: branch2wi[branch].toString(),
                url: `${AZURE_ORG_URL}/${PROJECT}/_apis/wit/workItems/${branch2wi[branch]}`
            })
        } else {
            branch2wi[branch].forEach(wi => {
                workItemRefs.push({
                    id: wi.toString(),
                    url: `${AZURE_ORG_URL}/${PROJECT}/_apis/wit/workItems/${wi}`
                }) 
            })
        }
        
    }

    const data = {
        sourceRefName: `refs/heads/${branch}`,
        targetRefName: `refs/heads/${TARGET_BRANCH}`,
        title: `${branch}`,
        description: `${branch}`,
        reviewers: [], // Add reviewers if needed,
        workItemRefs: workItemRefs
    };

    try {
        const response = await axios.post(url, data, {
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/json"
            }
        });

        console.log(`Pull Request created for branch: ${branch}. PR ID: ${response.data.pullRequestId}`);
        console.log(`Manage the PR at: ${AZURE_ORG_URL}/${PROJECT}/_git/${REPOSITORY}/pullrequest/${response.data.pullRequestId}`);
        return `${AZURE_ORG_URL}/${PROJECT}/_git/${REPOSITORY}/pullrequest/${response.data.pullRequestId}`;
    } catch (error) {
        console.error(`Failed to create PR for branch: ${branch}. Error: ${error.message}`);
        return null;
    }
}

function checkBranchStatus(directory){

    return new Promise((resolve, reject) => {
        setTimeout(() => {
            execSync(`git fetch`,{cwd: directory})
            execSync(`git log -n 3 origin/${TARGET_BRANCH} --oneline > ${__dirname}/fileCompare.log`,{cwd: directory})
            let fileCompCont = fs.readFileSync(__dirname+'/fileCompare.log','utf-8')
            let fileContent = fs.readFileSync(__dirname+'/file.log','utf-8')
            if(fileCompCont==fileContent){
                console.log('No changes detected')
                checkBranchStatus(directory)
                .then(() => {
                    resolve()
                })
            } else {
                console.log('Changes detected')
                resolve()
            }
        }, 5000);
    })

    
}

async function waitForCompletion(directory) {
    return new Promise((resolve) => {
        execSync(`git fetch`,{cwd: directory})
        execSync(`git log -n 3 origin/${TARGET_BRANCH} --oneline > ${__dirname}/file.log`,{cwd: directory})
        
        checkBranchStatus(directory)
        .then(() => {
            console.log('PR completed')
            resolve()
        })
    });
}

async function processBranches(directory,tBranch,data,group,num) {

    if(tBranch){
        TARGET_BRANCH = tBranch
    }

    if(data){
        AZURE_ORG_URL = data[0].azure_org_url
        PROJECT = data[0].project
        REPOSITORY = data[0].repository
        PAT = data[0].decrypted_pat
    }

    if(!PAT || !AZURE_ORG_URL || !REPOSITORY || !PROJECT){
        console.error('ERROR RETRIEVING SETTINGS')
        return
    }

    if(group){
        if (typeof group !== "number" || group < 1) {
            console.error("Group must be a positive number (1-based index).");
            return
        }
        if (typeof num !== "number" || num <= 0) {
            console.error("Chunk size 'num' must be a positive number.");
            return
        }
        const startIndex = (group-1)*num
        branches = branches.slice(startIndex,startIndex+num)
    }

    console.log(branches)

    for (const branch of branches) {
        if(branch!=TARGET_BRANCH){
            console.log(`Processing branch: ${branch}`);
            const prLink = await createPullRequest(branch);
            if (prLink) {
                console.log(`Open this link to resolve conflicts: ${prLink}`);
                await openInBrowser(prLink)
                await waitForCompletion(directory);

                if(!tBranch2WI[TARGET_BRANCH]){
                    tBranch2WI[TARGET_BRANCH] = []
                }

                if(branch2wi[branch]){
                    if(!isList(branch2wi[branch])){
                        tBranch2WI[TARGET_BRANCH].push(branch2wi[branch])
                    } else {
                        tBranch2WI[TARGET_BRANCH].push(...branch2wi[branch])
                    }
                }

            } else {
                console.error(`Skipping branch ${branch} due to error.`);
            }
        }
        
    }

    console.log("All branches processed.");

    const resultB2WI = {
        ...branch2wi,
        ...Object.fromEntries(
            Object.entries(tBranch2WI).filter(([key]) => !(key in branch2wi))
        ),
    };

    fs.writeFileSync(__dirname+'/branch2wi.json',JSON.stringify(resultB2WI),'utf-8')

    rl.close();

    console.log(`Checkout and fetch from origin/${TARGET_BRANCH}`)
    execSync(`git fetch`,{cwd: directory})
    try {
        execSync(`git checkout -b ${TARGET_BRANCH} origin/${TARGET_BRANCH} --quiet`,{cwd: directory})
    } catch(err){
        execSync(`git checkout ${TARGET_BRANCH} --quiet`,{cwd: directory})
    }
    
    execSync(`git pull origin ${TARGET_BRANCH}`,{cwd: directory})
}

async function openInBrowser(url) {
    // Platform-specific commands
    return new Promise((resolve, reject) => {
        const startCommand = process.platform === 'win32' ? 'start msedge' : process.platform === 'darwin' ? 'open' : 'xdg-open';

        exec(`${startCommand} ${url}`, (err) => {
            if (err) {
                console.error(`Error opening URL: ${err.message}`);
                reject()
            } else {
                console.log(`Opened URL: ${url}`);
                resolve()
            }
        });
    })
    
}

module.exports = {
    processBranches
}
