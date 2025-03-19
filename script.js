var wi
var package = false
var directory = '.'
var branch
var t = false
var pr = false
var createBrs = false
var complRel = false
const fs = require('fs')
const db = require(__dirname+'/data')
const { dirname } = require('path')
const { argv } = require('process')
var num = 3
var group
var sf = false
var targetOrg
var val = true

for(let i=0;i<process.argv.length;i++){
    switch(process.argv[i]){

        case '-c':
            createBrs = true
            break

        case '-b':
            branch = process.argv[i+1]
            break
        
        case '-t':
            t = true
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
        
        case '-sf':
            sf = true
            targetOrg = process.argv[i+1]
            break

        case '-val':
            val = true
            targetOrg = process.argv[i+1]
            break

    }
}

async function execute(){

    let TARGET_BRANCH = branch

    let sfv

    db.getActiveCredential(async(err,data)=>{

        if(err){
            console.error(err)
            return
        }

        if(!data || (data.length==0)){
            console.error('Non ci sono connessioni attive su Azure')
            return
        }

        if(directory=='.' && data[0].project_path!=process.cwd()){
            directory = data[0].project_path
        }
        
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

        if(val && targetOrg){
            sfv = require('./sf')
            sfv.validateDeploy(targetOrg,directory,TARGET_BRANCH)
            return
        }
    
        let testClasses
        let packageXml
        let pull_request

        if(!complRel && !t && !package && !pr){
            complRel = true
        }
    
        if(complRel){
            pull_request = require(__dirname+'/pull_request')
            await pull_request.processBranches(directory,TARGET_BRANCH,data,group,num)
            testClasses = require(__dirname+'/testClasses')
            await testClasses.mergeJsonFilesToTargetBranch(directory,'manifest/sfdc_test_classes.json',TARGET_BRANCH,group,num)
            packageXml = require(__dirname+'/packageXml.js')
            await packageXml.mergePackageXmlFilesToTargetBranch(directory,'manifest/package.xml',TARGET_BRANCH,group,num)

            if(sf && targetOrg){
                sfv = require('./sf')
                sfv.validateDeploy(targetOrg,directory)
            }
        }
    
        else {
            if(pr){
                pull_request = require(__dirname+'/pull_request')
                pull_request.processBranches(directory,TARGET_BRANCH,data,group,num)
            }
        
            else {
                if(t){
                    testClasses = require(__dirname+'/testClasses')
                    testClasses.mergeJsonFilesToTargetBranch(directory,'manifest/sfdc_test_classes.json',TARGET_BRANCH,group,num)
                } else if(package) {
                    packageXml = require(__dirname+'/packageXml.js')
                    packageXml.mergePackageXmlFilesToTargetBranch(directory,'manifest/package.xml',TARGET_BRANCH,group,num)
                }
            }
        }
    
    })
    
}

execute()