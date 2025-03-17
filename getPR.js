// queryPRs.js

const axios = require('axios');
const readline = require('readline');
const db = require(__dirname+'/data')
const { exec } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Replace these values with your actual configuration
var azure_url = '';
var project = '';
var repositoryId = ''; // repository name or GUID
const apiVersion = '7.1';

// Your Azure DevOps Personal Access Token (PAT)
var personalAccessToken = '';
var view = false

// Ensure that the branch name is passed as a command-line parameter

var branchNameParam

for(let i=0;i<process.argv.length;i++){

  switch(process.argv[i]){

    case '-b':
      branchNameParam = process.argv[i+1];
      break

    case '-v':
      view = true
      break

  }
  
}


if (!branchNameParam) {
  console.error('Usage: node queryPRs.js <branch-name>');
  process.exit(1);
}

var authToken
var headers

// The branch name should be provided without the "refs/heads/" prefix (e.g., "develop")
const branchName = branchNameParam;

/**
 * Helper function: Query pull requests based on a given ref parameter (source or target)
 * @param {string} refParam - The ref parameter to filter on ('sourceRefName' or 'targetRefName')
 * @param {string} branch - The branch name (without "refs/heads/" prefix)
 * @returns {Promise<Array>} - Promise resolving to an array of pull requests.
 */
async function getPullRequestsByRef(refParam, branch) {
  // The branch name must be prefixed with "refs/heads/"
  const refValue = `refs/heads/${branch}`;
  const url = `${azure_url}/${project}/_apis/git/repositories/${repositoryId}/pullRequests`;
  
  // Build query parameters: include the specific searchCriteria.
  const params = {
    'api-version': apiVersion,
    [`searchCriteria.${refParam}`]: refValue,
    // Optionally, filter by status, e.g., active:
    'searchCriteria.status': 'completed'
  };
  
  const response = await axios.get(url, { headers, params });
  return response.data.value;  // API returns an object with a "value" array containing the PRs.
}

/**
 * Main function: Query both source and target pull requests for the given branch and combine the results.
 */
async function queryPullRequestsRelatedToBranch(branch) {
  try {
    // Query pull requests where the branch is the source.
    const sourcePRs = await getPullRequestsByRef('sourceRefName', branch);
    // Query pull requests where the branch is the target.
    const targetPRs = await getPullRequestsByRef('targetRefName', branch);
    
    // Combine the results and remove duplicates (if a PR shows up in both queries).
    const prMap = new Map();
    sourcePRs.concat(targetPRs).forEach(pr => {
      // Use pullRequestId as the unique key.
      prMap.set(pr.pullRequestId, pr);
    });

    const allRelatedPRs = Array.from(prMap.values()).sort((pr1,pr2) => {
        return pr1.creationDate>pr2.creationDate ? 1 : (pr1.creationDate==pr2.creationDate ? 0 : -1)
    });
    
    console.log(`Found ${allRelatedPRs.length} pull request(s) related to branch '${branch}':`);
    for(const pr of allRelatedPRs) {
      console.log(`- PR ID: ${pr.pullRequestId}, Title: ${pr.title}, ${pr.creationDate}, source: ${pr.sourceRefName}, target: ${pr.targetRefName}`);
      if(view){
        await openInBrowser(getPrLink(pr.pullRequestId))
        await waitForCompletion();
      }
      

    };

    if(allRelatedPRs.length>0){
        console.log("All PRs checked.");
    }
    
    
    return allRelatedPRs;
    
  } catch (error) {
    console.error('Error querying pull requests:', error.response ? error.response.data : error.message);
  }
}

async function waitForCompletion() {
    return new Promise((resolve) => {
        rl.question("Check PR in the browser and press ENTER to continue...", () => {
            resolve();
        });
    });
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

db.getActiveCredential(async(err,data)=>{

    if(err){
      console.error(err)
      return
    }

    if(!data || data.length==0){
      console.error('No active credential found')
      return
    }

    azure_url = data[0].azure_org_url
    project = data[0].project
    repositoryId = data[0].repository
    personalAccessToken = data[0].decrypted_pat

    // Azure DevOps uses Basic Authentication with the PAT.
// The username can be blank; encode as ":PAT" in base64.
    authToken = Buffer.from(`:${personalAccessToken}`).toString('base64');
    headers = {
        'Authorization': `Basic ${authToken}`,
        'Content-Type': 'application/json'
    };

    // Run the query with the branch name provided as a parameter.
    queryPullRequestsRelatedToBranch(branchName);
})

function getPrLink(prId){
    return `${azure_url}/${project}/_git/${repositoryId}/pullrequest/${prId}?_a=files`
}
