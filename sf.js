const { dir } = require('console');

const execSync = require('child_process').execSync;
const FILE_PATH = 'manifest/sfdc_test_classes.json';
const fs = require('fs')

async function validateDeploy(targetOrg,directory,branch){

    if(targetOrg && directory){
        console.log('Start validate deploy')

        if(branch){
            execSync(`git checkout ${branch} --quiet`,{cwd: directory})
            execSync(`git fetch`,{cwd: directory})
            execSync(`git pull origin ${branch}`,{cwd: directory})
        }

        let command = `sf project deploy validate -o ${targetOrg} -x manifest/package.xml`

        let jsonTest = JSON.parse(fs.readFileSync(directory+'/'+FILE_PATH,'utf-8'))

        if('key1' in jsonTest){
            let testClasses = jsonTest.key1
            if(!testClasses){
                testClasses = 'CollectionUtilTest'
            }
            testClasses = testClasses.replaceAll(',',' ')
            command += ` -l RunSpecifiedTests -t ${testClasses} -w 5`

            console.log(command)

            execSync(`${command}`,{cwd: directory})
        }

        
    }

}

module.exports = {
    validateDeploy
}