const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const fs = require('fs');

function decodeBase64(input) {
    try {
        const buffer = Buffer.from(input, 'base64');
        return buffer.toString('utf8');
    } catch (error) {
        console.error('Error decoding Base64 string:', error);
        return null;
    }
}

function encodeBase64(input) {
    try {
        const output = Buffer.from(input).toString('base64');
        return output;
    } catch (error) {
        console.error('Error encoding Base64 string:', error);
        return null;
    }
}


// Encryption key (should be stored securely, e.g., environment variables)
//const ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

let ENCRYPTION_KEY;
try {
    if(!fs.existsSync(__dirname+'/settings.json')){
        ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
        const encryptedKey = encodeBase64(ENCRYPTION_KEY)
        fs.writeFileSync(__dirname+'/settings.json',JSON.stringify({key: encryptedKey}),'utf-8')
    } 
    
    else {
        ENCRYPTION_KEY = decodeBase64(JSON.parse(fs.readFileSync(__dirname + '/settings.json', 'utf-8')).key);
    }
    
    
} catch (e) {
    console.error('ERROR RETRIEVING ENC KEY');
    return;
}

if(!ENCRYPTION_KEY){
    console.error('ERROR RETRIVING ENCRYPTION KEY')
    return
}

const IV_LENGTH = 16; // AES block size

// Encrypt a given text using AES-256-CBC
function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

// Decrypt a given text using AES-256-CBC
function decrypt(text) {
    const [iv, encrypted] = text.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(Buffer.from(encrypted, 'hex'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

const db = new sqlite3.Database(__dirname + '/data.db', (err) => {
    if (err) {
        console.error('Error connecting to SQLite:', err);
    } else {
        console.log('Connected to SQLite database.');
        createTable();
    }
});

// Create the credentials table if it does not exist
function createTable() {
    db.run(
        `CREATE TABLE IF NOT EXISTS credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            azure_org_url TEXT,
            project TEXT,
            repository TEXT,
            project_path TEXT,
            encrypted_pat TEXT,
            active INT
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

// Insert encrypted data only if the combination of azure_org_url, project, and repository does not exist.
// Note: The duplicate check remains on the triple. The project_path is stored but not used for duplication.
function insertData(azureOrgUrl, project, repository, projectPath, pat, callback) {
    // First, check if the record already exists (based on azure_org_url, project, repository)
    db.get(
      `SELECT * FROM credentials WHERE azure_org_url = ? AND project = ? AND repository = ?`,
      [azureOrgUrl, project, repository],
      (err, row) => {
        if (err) {
          console.error('Error checking existing data:', err);
          callback(err);
        } else if (row) {
          console.error('Credential already exists for the given azure_org_url, project, and repository.');
          callback(new Error('Credential already exists.'));
        } else {
          const encryptedPAT = encrypt(pat);
          db.run(
            `INSERT INTO credentials (azure_org_url, project, repository, project_path, encrypted_pat, active) VALUES (?, ?, ?, ?, ?, ?)`,
            [azureOrgUrl, project, repository, projectPath, encryptedPAT, 0],
            function (err) {
              if (err) {
                console.error('Error inserting data:', err);
                callback(err);
              } else {
                console.log('Data inserted successfully.');
                callback(null);
              }
            }
          );
        }
      }
    );
}

// Retrieve and decrypt data (the decrypted_pat property is exposed to the caller)
function getData(callback) {
    db.all(`SELECT * FROM credentials`, [], (err, rows) => {
        if (err) {
            console.error('Error fetching data:', err);
            callback(err, null);
        } else {
            const decryptedRows = rows.map((row) => ({
                ...row,
                decrypted_pat: decrypt(row.encrypted_pat),
            }));

            callback(null, decryptedRows);
        }
    });
}

function getDataById(id,callback) {
    db.all(`SELECT * FROM credentials WHERE id=?`, [id], (err, rows) => {
        if (err) {
            console.error('Error fetching data:', err);
            callback(err, null);
        } else {
            const decryptedRows = rows.map((row) => ({
                ...row,
                decrypted_pat: decrypt(row.encrypted_pat),
            }));

            callback(null, decryptedRows);
        }
    });
}

// Retrieve and decrypt data (the decrypted_pat property is exposed to the caller)
function getActiveCredential(callback) {
    db.all(`SELECT * FROM credentials WHERE active=1`, [], (err, rows) => {
        if (err) {
            console.error('Error fetching data:', err);
            callback(err, null);
        } else {
            const decryptedRows = rows.map((row) => ({
                ...row,
                decrypted_pat: decrypt(row.encrypted_pat),
            }));

            callback(null, decryptedRows);
        }
    });
}

// Update the personal access token (PAT) for a given credential by id
function updateData(id, newPat, callback) {
    const encryptedPAT = encrypt(newPat);
    db.run(
        `UPDATE credentials SET encrypted_pat = ? WHERE id = ?`,
        [encryptedPAT, id],
        function (err) {
            if (err) {
                console.error('Error updating data:', err);
                callback(err);
            } else {
                console.log(`Data updated successfully for id ${id}`);
                callback(null);
            }
        }
    );
}

// Delete a credential by id
function deleteData(id, callback) {
    db.run(
        `DELETE FROM credentials WHERE id = ?`,
        [id],
        function (err) {
            if (err) {
                console.error('Error deleting data:', err);
                callback(err);
            } else {
                console.log(`Data deleted successfully for id ${id}`);
                callback(null);
            }
        }
    );
}

function updateActiveCredential(activeId, callback) {
    db.serialize(() => {
      db.run(`UPDATE credentials SET active = 0`, (err) => {
        if (err) {
          console.error('Error resetting active flags:', err);
          callback(err);
        } else {
          db.run(`UPDATE credentials SET active = 1 WHERE id = ?`, [activeId], function (err) {
            if (err) {
              console.error('Error setting active credential:', err);
              callback(err);
            } else {
              console.log(`Credential ${activeId} set to active.`);
              callback(null);
            }
          });
        }
      });
    });
  }

module.exports = {
    insertData,
    getData,
    getDataById,
    getActiveCredential,
    updateData,
    deleteData,
    updateActiveCredential
};
