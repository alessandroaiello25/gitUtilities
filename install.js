#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Helper to run shell commands (if needed)
function runCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing: ${command}\n`, stderr);
        return reject(error);
      }
      console.log(stdout);
      resolve();
    });
  });
}

async function performInstallation() {
  console.log('Performing installation tasks...');
  // (Place any installation commands here, such as npm install, Angular build, cleanup, etc.)
  // For example:
  await runCommand('npm install');
  await runCommand('cd client && npm install && ng build');
  await runCommand('rd /s /q client\\node_modules');
  await runCommand('del package-lock.json') // Remove node_modules from the client directory
}

function extractRunExe() {
  const destPath = path.join(process.cwd(), 'run.exe');
  if (fs.existsSync(destPath)) {
    console.log('run.exe already exists at:', destPath);
    return;
  }
  
  // __dirname points to the location in the pkg snapshot.
  // Since run.exe is included as an asset, it should be accessible via __dirname.
  const assetPath = path.join(__dirname, 'run.exe');
  
  try {
    // Read the binary data from the embedded asset
    const data = fs.readFileSync(assetPath);
    // Write it to the current directory with executable permissions
    fs.writeFileSync(destPath, data, { mode: 0o755 });
    console.log('run.exe extracted successfully to:', destPath);
  } catch (err) {
    console.error('Failed to extract run.exe:', err);
    process.exit(1);
  }
}

(async () => {
  try {
    await performInstallation();
    extractRunExe();

    console.log('Installation complete! You can now run run.exe to start your application.');

    // Optionally, launch run.exe automatically:
    // const child = exec('run.exe', (err, stdout, stderr) => {
    //   if (err) {
    //     console.error('Error launching run.exe:', err);
    //   }
    // });
    // child.stdout.pipe(process.stdout);
    // child.stderr.pipe(process.stderr);
    
  } catch (error) {
    console.error('Installation failed:', error);
    process.exit(1);
  }
})();
