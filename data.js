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

let ENCRYPTION_KEY;
try {
    ENCRYPTION_KEY = decodeBase64(JSON.parse(fs.readFileSync(__dirname + '/settings.json', 'utf-8')).key);
} catch (e) {
    console.error('ERROR RETRIEVING ENC KEY');
    return;
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

// Insert encrypted data with callback
function insertData(azureOrgUrl, project, repository, pat, callback) {
    const encryptedPAT = encrypt(pat);
    db.run(
        `INSERT INTO credentials (azure_org_url, project, repository, encrypted_pat) VALUES (?, ?, ?, ?)`,
        [azureOrgUrl, project, repository, encryptedPAT],
        (err) => {
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

module.exports = {
    insertData,
    getData,
    updateData,
    deleteData
};
