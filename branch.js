const execSync = require('child_process').execSync;

function getCurrentBranch(directory = '.') {
    try {
        const command = `git -C ${directory} rev-parse --abbrev-ref HEAD`;
        const branchName = execSync(command, { encoding: 'utf-8' }).trim();
        return branchName;
    } catch (error) {
        console.error('Error getting current branch:', error.message);
        return null;
    }
}

module.exports = {
    getCurrentBranch
}