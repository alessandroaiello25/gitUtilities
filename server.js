// server.js
const express = require('express');
const path = require('path');
const data = require('./data');

const app = express();
app.use(express.json());

// CORS configuration (if Angular is served on a different domain/port)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // For production, set a specific origin
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
    return res.status(200).json({});
  }
  next();
});

// API Endpoints
app.get('/api/credentials', (req, res) => {
  data.getData((err, rows) => {
    if (err) return res.status(500).json({ error: 'Error retrieving data.' });
    const filteredRows = rows.map(({ decrypted_pat, ...rest }) => rest);
    res.json(filteredRows);
  });
});

// Insert Credential API Endpoint
app.post('/api/credentials', (req, res) => {
  const { azure_org_url, project, repository, project_path, pat } = req.body;
  if (!azure_org_url || !project || !repository || !pat) {
    return res.status(400).json({ error: 'azure_org_url, project, repository and pat are required.' });
  }
  data.insertData(azure_org_url, project, repository, project_path || '.', pat, (err) => {
    if (err) {
      if (err.message === 'Credential already exists.') {
        return res.status(409).json({ error: 'Credential already exists.' });
      }
      return res.status(500).json({ error: 'Error inserting data.' });
    }
    res.json({ message: 'Credential inserted successfully.' });
  });
});

app.put('/api/credentials/:id', (req, res) => {
  const { id } = req.params;
  const { pat } = req.body;
  if (!pat) return res.status(400).json({ error: 'PAT is required.' });
  data.updateData(id, pat, (err) => {
    if (err) return res.status(500).json({ error: 'Error updating data.' });
    res.json({ message: 'Credential updated successfully.' });
  });
});

app.delete('/api/credentials/:id', (req, res) => {
  const { id } = req.params;
  data.deleteData(id, (err) => {
    if (err) return res.status(500).json({ error: 'Error deleting data.' });
    res.json({ message: 'Credential deleted successfully.' });
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

/* const express = require('express');
const path = require('path');
const data = require('./data'); // External module with business logic

const app = express();
app.use(express.urlencoded({ extended: true }));

// Set EJS as the templating engine and define the views directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Home page route
app.get('/', (req, res) => {
    res.render('index');
});

// -------------------------------
// Insert Credential Page & Route
// -------------------------------
app.get('/insert', (req, res) => {
    res.render('insert',{toast: null});
});

app.post('/insert', (req, res) => {
  const { azure_org_url, project, repository, pat } = req.body;
  data.insertData(azure_org_url, project, repository, pat, (err) => {
      if (err) {
          res.render('insert', { toast: { type: 'error', message: 'Error inserting data.' } });
      } else {
          res.render('insert', { toast: { type: 'success', message: 'Credential inserted successfully.' } });
      }
  });
});

// -------------------------------
// Update Credential Page & Route
// -------------------------------
app.get('/update', (req, res) => {
    data.getData((err, rows) => {
        if (err) {
            res.send('Error retrieving data.');
        } else {
            // Remove decrypted_pat property before sending to the client
            const filteredRows = rows.map(({ decrypted_pat, ...rest }) => rest);
            res.render('update', { credentials: filteredRows, toast: null });
        }
    });
});

app.post('/update', (req, res) => {
  const { id, pat } = req.body;
  data.updateData(id, pat, (err) => {
      data.getData((err2, rows) => {
          if (err || err2) {
              const filteredRows = rows ? rows.map(({ decrypted_pat, ...rest }) => rest) : [];
              res.render('update', {
                  credentials: filteredRows,
                  toast: { type: 'error', message: 'Error updating data.' }
              });
          } else {
              const filteredRows = rows.map(({ decrypted_pat, ...rest }) => rest);
              res.render('update', {
                  credentials: filteredRows,
                  toast: { type: 'success', message: 'Credential updated successfully.' }
              });
          }
      });
  });
});

// -------------------------------
// Delete Credential Route
// -------------------------------
app.post('/delete', (req, res) => {
  const { id } = req.body;
  data.deleteData(id, (err) => {
      data.getData((err2, rows) => {
          if (err || err2) {
              const filteredRows = rows ? rows.map(({ decrypted_pat, ...rest }) => rest) : [];
              res.render('update', {
                  credentials: filteredRows,
                  toast: { type: 'error', message: 'Error deleting data.' }
              });
          } else {
              const filteredRows = rows.map(({ decrypted_pat, ...rest }) => rest);
              res.render('update', {
                  credentials: filteredRows,
                  toast: { type: 'success', message: 'Credential deleted successfully.' }
              });
          }
      });
  });
});

// -------------------------------
// Start the Server
// -------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
 */