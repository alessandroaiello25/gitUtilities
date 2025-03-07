const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const fs = require('fs')

// Encryption key (should be stored securely, e.g., environment variables)
//const ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

var ENCRYPTION_KEY
try {
    ENCRYPTION_KEY = decodeBase64(JSON.parse(fs.readFileSync(__dirname+'/settings.json','utf-8')).key)
} catch(e){
    console.error('ERROR RETRIEVING ENC KEY')
    return
}

const IV_LENGTH = 16; // AES block size

// Function to encrypt data
function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decodeBase64(input) {
    try {
      // Create a Buffer from the Base64 string
      const buffer = Buffer.from(input, 'base64');
      // Convert the Buffer to a UTF-8 string
      return buffer.toString('utf8');
    } catch (error) {
      console.error('Error decoding Base64 string:', error);
      return null;
    }
}


// Function to decrypt data
function decrypt(text) {
    
    const [iv, encrypted] = text.split(':');
    const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        Buffer.from(ENCRYPTION_KEY, 'hex'),
        Buffer.from(iv, 'hex')
    );
    let decrypted = decipher.update(Buffer.from(encrypted, 'hex'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

// Initialize SQLite database
const db = new sqlite3.Database(__dirname+'/data.db', (err) => {
    if (err) {
        console.error('Error connecting to SQLite:', err);
    } else {
        console.log('Connected to SQLite database.');
        createTable();
    }
});

// Create table
function createTable() {
    db.run(
        `CREATE TABLE IF NOT EXISTS credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            azure_org_url TEXT,
            project TEXT,
            repository TEXT,
            encrypted_pat TEXT
        )`,
        (err) => {
            if (err) {
                console.error('Error creating table:', err);
            } else {
                console.log('Table created or already exists.');
            }
        }
    );
}

// Insert encrypted data
function insertData(azureOrgUrl, project, repository, pat) {
    const encryptedPAT = encrypt(pat);
    db.run(
        `INSERT INTO credentials (azure_org_url, project, repository, encrypted_pat) VALUES (?, ?, ?, ?)`,
        [azureOrgUrl, project, repository, encryptedPAT],
        (err) => {
            if (err) {
                console.error('Error inserting data:', err);
            } else {
                console.log('Data inserted successfully.');
            }
        }
    );
}

// Retrieve and decrypt data
function getData(callback) {

    db.all(`SELECT * FROM credentials`, [], (err, rows) => {
        if (err) {
            console.error('Error fetching data:', err);
        } else {
            const decryptedRows = rows.map((row) => ({
                ...row,
                decrypted_pat: decrypt(row.encrypted_pat),
            }));
            callback(decryptedRows);
        }
    });
}

// Example Usage
// Uncomment to add a new record
// insertData('https://dev.azure.com/organization', 'project-name', 'repository-name', 'your-personal-access-token');

// Uncomment to fetch and display data
// getData((data) => {
//     console.log('Decrypted Data:', data);
// });

module.exports = {
    getData
}
