const fs = require('fs');
const path = require('path');
const { cwd } = require('process');
const readline = require('readline');
const xml2js = require('xml2js');
const execSync = require('child_process').execSync;

var directory = '.'

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

const TAG_TO_FILTER = 'PROD_RELEASE_' + getTodayTag(); // Tag to filter
const OUTPUT_FILE = 'manifest/package.xml'; // Final output file
let TARGET_BRANCH = '';

function getTodayTag() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}${month}${year}`;
}

function getBranchesWithTag(tag) {
    console.log('Fetching remote branches...');
    execSync('git fetch --all --tags --quiet');

    const branches = execSync(`git tag --list '${tag}*'`)
        .toString()
        .split('\n')
        .map(branch => branch.trim().replace('origin/', ''))
        .filter(branch => branch.length > 0);
    return branches;
}

function readPackageXmlFromBranch(branch, filePath) {
    console.log(`Checking out branch: ${branch}`);
    execSync(`git checkout origin/${branch} --quiet`,{cwd: directory});
    const fullPath = path.join(directory, filePath);

    if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        return xml2js.parseStringPromise(content);
    } else {
        console.warn(`File not found in branch ${branch}: ${filePath}`);
        return null;
    }
}

function compareVersions(version1, version2) {
    const [major1, minor1] = version1.split('.').map(Number);
    const [major2, minor2] = version2.split('.').map(Number);

    if (major1 > major2 || (major1 === major2 && minor1 > minor2)) {
        return version1;
    }
    return version2;
}

function mergePackageXmlObjects(obj1, obj2) {
    const merged = { ...obj1 };

    if(obj2.Package.types){
        obj2.Package.types.forEach(type2 => {
            const existingType = merged.Package.types.find(
                type1 => type1.name[0] === type2.name[0]
            );
    
            if (existingType) {
                const membersSet = new Set([
                    ...existingType.members,
                    ...type2.members
                ]);
                existingType.members = Array.from(membersSet).sort();
            } else {
                merged.Package.types.push({
                    name: type2.name,
                    members: Array.from(new Set(type2.members)).sort()
                });
            }
        });
    }

    // Ensure types are sorted by name
    merged.Package.types.sort((a, b) => a.name[0].localeCompare(b.name[0]));

    // Restructure types so members are listed before name
    merged.Package.types = merged.Package.types.map(type => ({
        members: type.members,
        name: type.name
    }));

    // Update version to the higher one
    merged.Package.version[0] = compareVersions(
        merged.Package.version[0],
        obj2.Package.version[0]
    );

    return merged;
}

async function mergePackageXmlFilesToTargetBranch(dir,filePath, targetBranch, group, n) {
    
    TARGET_BRANCH = targetBranch;
    let mergedPackageXml = {
        Package: {
            $: { xmlns: 'http://soap.sforce.com/2006/04/metadata' },
            types: [],
            version: ['56.0'], // Default version
        },
    };

    directory = dir

    let branches = Array.from(new Set(fs.readFileSync(__dirname + '/branches', 'utf-8').split('\n')));

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

    for (const branch of branches) {
        const xml = await readPackageXmlFromBranch(branch, filePath);
        if (xml) {
            console.log(`Merging package.xml from branch: ${branch}`);
            mergedPackageXml = mergePackageXmlObjects(mergedPackageXml, xml);
        }
    }

    console.log(`Checking out target branch: ${TARGET_BRANCH}`);
    execSync(`git checkout ${TARGET_BRANCH} --quiet`,{cwd: directory});

    const builder = new xml2js.Builder();
    const xmlOutput = builder.buildObject(mergedPackageXml);

    fs.writeFileSync(dir+'/'+OUTPUT_FILE, xmlOutput);
    console.log(`Merged package.xml written to ${OUTPUT_FILE}`);

    execSync(`code ${OUTPUT_FILE}`,{cwd: directory});

    return new Promise((resolve,reject) => {
        rl.question('Confermi le modifiche al package.xml? Y/N ', (answ) => {
            if (answ && answ.toUpperCase() === 'Y') {
                console.log(`Committing and pushing to branch: ${TARGET_BRANCH}`);
                execSync(`git add ${OUTPUT_FILE}`,{cwd: directory});
                execSync(`git commit -m "Merged package.xml files for branch ${TARGET_BRANCH}"`,{cwd: directory});
                execSync(`git push origin ${TARGET_BRANCH}`,{cwd: directory});
                console.log(`Changes pushed successfully to ${TARGET_BRANCH}.`);
            } else {
                execSync(`git restore ${OUTPUT_FILE}`,{cwd: directory});
                console.log('Modifiche annullate');
            }
            rl.close();
            resolve('OK')
        });
    })

    
}

const FILE_PATH = 'manifest/package.xml'; // Path to the package.xml file
module.exports = { mergePackageXmlFilesToTargetBranch };