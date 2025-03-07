const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { workerData } = require('worker_threads');

var directory = '.'

// Creiamo un'interfaccia per leggere l'input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});


const execSync = require('child_process').execSync;

const TAG_TO_FILTER = 'PROD_RELEASE_'+getTodayTag(); // Tag to filter
const OUTPUT_FILE = 'manifest/sfdc_test_classes.json'; // Final output file

// Read the target branch from the command line
let TARGET_BRANCH = '';

// Function to get today's date in ddmmyyyy format
function getTodayTag() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}${month}${year}`;
}

// Function to fetch branches with a specific tag
function getBranchesWithTag(tag) {
    console.log('Fetching remote branches...');
    execSync('git fetch --all --tags --quiet');

    console.log(`git tag --list '${TAG_TO_FILTER}*'`)

    const branches = execSync('git tag --list '+TAG_TO_FILTER+'*')
        .toString()
        .split('\n')
        .map(branch => branch.trim().replace('origin/', ''))
        .filter(branch => branch.length > 0);
    return branches;
}

function findBranchesForTag(tag) {
    try {
        // Run the Git command to get branches containing the tag
        const result = execSync('git branch -r --contains '+tag, { encoding: "utf-8" });
        
        // Process output: split by lines, trim whitespace, and filter empty lines
        return result
            .split("\n")
            .map(branch => branch.trim())
            .filter(branch => branch.length > 0);
    } catch (error) {
        console.error(`Error finding branches for tag '${tag}': ${error.message}`);
        return [];
    }
}

// Function to read JSON from a branch
function readJsonFromBranch(branch, filePath) {
    console.log(`Checking out branch: ${branch}`);
    execSync('git checkout origin/'+branch+' --quiet',{cwd: directory});
    const fullPath = path.join(directory, filePath);

    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf-8');
        // Check for BOM and remove it
        if (content.charCodeAt(0) === 0xFEFF) {
            console.log('BOM detected, removing...');
            content = content.slice(1); // Remove the BOM
        }
        try {
            return JSON.parse(content);
        } catch (e) {
            console.error(`Invalid JSON in branch ${branch}: ${e.message}`);
            return null;
        }
    } else {
        console.warn(`File not found in branch ${branch}: ${filePath}`);
    }
    return null;
}

// Function to merge two JSON objects
function mergeJSONObjects(obj1, obj2) {
    const merged = { ...obj1 };

    for (const key in obj2) {
        if (merged[key]) {
            const set1 = new Set(
                merged[key]
                    .split(',')
                    .map(x => x.trim())
                    .filter(x => x !== '')
            );
            const set2 = new Set(
                obj2[key]
                    .split(',')
                    .map(x => x.trim())
                    .filter(x => x !== '')
            );
            const mergedSet = new Set([...set1, ...set2]);
            merged[key] = Array.from(mergedSet).sort().join(',');
        } else {
            merged[key] = obj2[key];
        }
    }

    return merged;
}

// Function to merge JSON from branches into the target branch
async function mergeJsonFilesToTargetBranch(dir,filePath,targetBranch,group,n) {
    /*const tags = getBranchesWithTag(TAG_TO_FILTER);

    console.log(tags)

    if (tags.length === 0) {
        console.log(`No branches found with tag: ${TAG_TO_FILTER}`);
        return;
    }*/

    return new Promise((resolve,reject) => {
        directory = dir

        TARGET_BRANCH = targetBranch

        let mergedJson = {};

        let branches = Array.from(new Set(fs.readFileSync(__dirname+'/branches','utf-8').split('\n')))

        /*tags.forEach(tag => {
            console.log(`Processing tag: ${tag}`);
            const brs = findBranchesForTag(tag);
            if (brs.length > 0) {
                branches.add(...brs)
                console.log(`Branches for tag '${tag}':`, brs);
            } else {
                console.warn(`No branches found containing tag '${tag}'.`);
            }
        });*/

        if(group){
            if (typeof group !== "number" || group < 1) {
                console.error("Group must be a positive number (1-based index).");
                return
            }
            if (typeof n !== "number" || n <= 0) {
                console.error("Chunk size 'n' must be a positive number.");
                return
            }
            const startIndex = (group-1)*n
            branches = branches.slice(startIndex,startIndex+n)
        }

        console.log(branches)


        branches.forEach(branch => {
            const json = readJsonFromBranch(branch, filePath);
            if (json) {
                console.log(`Merging JSON from branch: ${branch}`);
                mergedJson = mergeJSONObjects(mergedJson, json);
            }
        });

        const {key1, ...rest} = mergedJson

        mergedJson = { key1 }

        // Checkout the target branch
        console.log(`Checking out target branch: ${TARGET_BRANCH}`);
        execSync('git checkout '+TARGET_BRANCH+' --quiet',{cwd: directory});
        fs.writeFileSync(dir+'/'+OUTPUT_FILE, JSON.stringify(mergedJson, null, 4));
        console.log(`Merged JSON written to ${OUTPUT_FILE}`);

        // Commit and push the changes to the target branch

        execSync('code '+OUTPUT_FILE, {cwd: directory})

        rl.question('Confermi le classi di test? Y/N ', (answ) => {
            
            if(answ && answ=='Y'){
                console.log(`Committing and pushing to branch: ${TARGET_BRANCH}`);
                execSync('git add '+OUTPUT_FILE,{cwd: directory});
                execSync('git commit -m "Merged JSON test classes for branch '+TARGET_BRANCH+'"',{cwd: directory});
                execSync('git push origin '+TARGET_BRANCH,{cwd: directory});
                console.log(`Changes pushed successfully to ${TARGET_BRANCH}.`);
            } else {
                execSync('git restore '+OUTPUT_FILE,{cwd: directory})
                console.log('Modifiche annullate')
            }

            // Chiudiamo l'interfaccia
            rl.close();

            resolve('OK')
        });
    })

    
}

// Execute the merge function
const FILE_PATH = 'manifest/sfdc_test_classes.json'; // Path to the JSON file

module.exports = {mergeJsonFilesToTargetBranch}
