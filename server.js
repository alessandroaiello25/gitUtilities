// Backend: Node.js Express server
const express = require('express');
const fs = require('fs');
const path = require('path');
const branchWI = require('./branchWI');
const testClasses = require('./testClasses');
const packageXml = require('./packageXml');
const br = require('./branch');

const app = express();
const PORT = 3000;

// Middleware to parse JSON and serve static files
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to execute script logic
app.post('/execute', async (req, res) => {
    const { branch, wi, packageOpt, directory } = req.body;

    let TARGET_BRANCH = branch;

    try {
        if (wi) {
            TARGET_BRANCH = await branchWI.getWorkItemsByStatus(wi);
        }

        if (!wi && !branch) {
            branch = br.getCurrentBranch(directory || '.');
            if (!branch) {
                return res.status(400).json({ message: 'Unable to calculate current branch. Provide a work item code, target branch, or a directory with a git repository.' });
            }
            TARGET_BRANCH = branch;
        }

        if (!fs.existsSync(path.join(__dirname, 'branches')) && !wi) {
            return res.status(400).json({ message: 'Unable to find branches file.' });
        }

        if (packageOpt) {
            packageXml.mergePackageXmlFilesToTargetBranch(directory || '.', 'manifest/package.xml', TARGET_BRANCH);
        } else {
            testClasses.mergeJsonFilesToTargetBranch(directory || '.', 'manifest/sfdc_test_classes.json', TARGET_BRANCH);
        }

        res.status(200).json({ message: 'Operation completed successfully!' });
    } catch (error) {
        res.status(500).json({ message: `Error: ${error.message}` });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

// Save this file as "server.js"
