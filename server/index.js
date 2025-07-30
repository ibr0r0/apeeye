const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, 'db.json');

function loadDB() {
  if (!fs.existsSync(DB_PATH)) return { endpoints: [] };
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    const db = data.trim() ? JSON.parse(data) : { endpoints: [] };
    db.endpoints = (db.endpoints || []).map(ep => ({
      ...ep,
      url: ep.url.startsWith('/') ? ep.url : '/' + ep.url
    }));
    return db;
  } catch {
    return { endpoints: [] };
  }
}
function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
function normalizeUrl(url) {
  if (!url.startsWith('/')) return '/' + url;
  return url;
}

app.get('/api/endpoints', (req, res) => {
  const db = loadDB();
  res.json(db.endpoints || []);
});
app.post('/api/endpoints', (req, res) => {
  const db = loadDB();
  let data = { ...req.body };
  data.url = normalizeUrl(data.url || '');
  data.method = (data.method || 'GET').toUpperCase();
  data.id = Date.now();
  db.endpoints = db.endpoints || [];
  db.endpoints.push(data);
  saveDB(db);
  res.status(201).json(data);
});
app.delete('/api/endpoints/:id', (req, res) => {
  const db = loadDB();
  const { id } = req.params;
  const before = db.endpoints.length;
  db.endpoints = db.endpoints.filter(item => String(item.id) !== String(id));
  saveDB(db);
  if (db.endpoints.length === before)
    return res.status(404).json({ error: 'ID not found' });
  res.json({ message: 'Deleted' });
});

app.use('/mock', (req, res) => {
  const db = loadDB();
  let pathName = req.path; 
  pathName = normalizeUrl(pathName);
  const method = req.method.toUpperCase();
  const endpoints = db.endpoints || [];
  const found = endpoints.find(
    ep => normalizeUrl(ep.url) === pathName && ep.method.toUpperCase() === method
  );
  if (!found) return res.status(404).json({ error: 'Mock endpoint not found' });
  try {
    res.json(JSON.parse(found.response));
  } catch {
    res.send(found.response);
  }
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

const PORT = process.env.PORT || 34567;
app.listen(PORT, () => {
  console.log('📝 DB_PATH:', DB_PATH);
  console.log(`🚀 Universal API running at http://localhost:${PORT}`);
  console.log('Mock API: /mock/<endpoint>');
});
