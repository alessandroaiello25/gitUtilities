var wi
var package = false
var directory = '.'
var branch
var pr = false
var createBrs = false
var complRel = false
const fs = require('fs')
const db = require(__dirname+'/data')
const { dirname } = require('path')
var num = 3
var group

for(let i=0;i<process.argv.length;i++){
    switch(process.argv[i]){

        case '-c':
            createBrs = true
            break

        case '-b':
            branch = process.argv[i+1]
            break

        case '-w':
            wi = process.argv[i+1]
            break

        case '-p':
            package = true
            break

        case '-r':
            pr = true
            break

        case '-d':
            directory = process.argv[i+1]
            break
        
        case '-cr':
            complRel = true
            break

        case '-g':
            group = Number(process.argv[i+1])
            break

        case '-n':
            num = Number(process.argv[i+1])
            break

    }
}

async function execute(){

    let TARGET_BRANCH = branch

    db.getActiveCredential(async(data)=>{
        if(wi){
            const branchWI = require(__dirname+'/branchWI')
            TARGET_BRANCH = await branchWI.getWorkItemsByStatus(wi,data).catch((err) => console.error(err));
        }
    
        if(branch){
            TARGET_BRANCH = branch
        }
    
        if(!wi && !branch){
    
            const br = require(__dirname+'/branch')
        
            branch = br.getCurrentBranch(directory)
        
            if(!branch){
                console.error('UNABLE TO CALCULATE CURRENT BRANCH. PASS the WORKITEM CODE OR A TARGET BRANCH OR A DIRECTORY WITH A GIT REPOSITITORY')
                return
            }
            
        }
    
        if(!wi){
            if(!fs.existsSync(__dirname+'/branches')){
                console.error('UNABLE TO FIND BRANCHES')
                return
            } else {
                let branches = fs.readFileSync(__dirname+'/branches','utf-8').split('\n')
    
                if(!branches || branches.length==0 || !branches[0]){
                    console.error('UNABLE TO FIND BRANCHES')
                    return
                }
            }
        }
    
        if(createBrs){
            return
        }
    
        let testClasses
        let packageXml
        let pull_request
    
        if(complRel){
            testClasses = require(__dirname+'/testClasses')
            await testClasses.mergeJsonFilesToTargetBranch(directory,'manifest/sfdc_test_classes.json',TARGET_BRANCH,group,num)
            packageXml = require(__dirname+'/packageXml.js')
            await packageXml.mergePackageXmlFilesToTargetBranch(directory,'manifest/package.xml',TARGET_BRANCH,group,num)
            pull_request = require(__dirname+'/pull_request')
            pull_request.processBranches(TARGET_BRANCH,data,group,num)
        }
    
        else {
            if(pr){
                pull_request = require(__dirname+'/pull_request')
                pull_request.processBranches(TARGET_BRANCH,data,group,num)
            }
        
            else {
                if(!package){
                    testClasses = require(__dirname+'/testClasses')
                    testClasses.mergeJsonFilesToTargetBranch(directory,'manifest/sfdc_test_classes.json',TARGET_BRANCH,group,num)
                } else {
                    packageXml = require(__dirname+'/packageXml.js')
                    packageXml.mergePackageXmlFilesToTargetBranch(directory,'manifest/package.xml',TARGET_BRANCH,group,num)
                }
            }
        }
    
    })
    
}

execute()