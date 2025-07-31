const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, 'db.json');

function loadDB() {
  if (!fs.existsSync(DB_PATH)) return {};
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return data.trim() ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getNextId(resource, db) {
  const items = db[resource] || [];
  return items.length ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
}
app.post('/api/endpoints', (req, res) => {
  const { resource } = req.body;
  if (!resource) return res.status(400).json({ error: 'Resource name required' });

  const db = loadDB();
  const key = resource.toLowerCase();
  if (!db[key]) db[key] = [];
  saveDB(db);

  res.status(201).json({ message: `Resource '${key}' created` });
});
app.get('/api/endpoints', (req, res) => {
  const db = loadDB();
  res.json(Object.keys(db));
});
app.delete('/api/endpoints/:resource', (req, res) => {
  const resource = req.params.resource.toLowerCase();
  const db = loadDB();

  if (!db[resource]) return res.status(404).json({ error: 'Resource not found' });

  delete db[resource];
  saveDB(db);
  res.json({ message: `Resource '${resource}' deleted` });
});
app.route('/mock/:resource')
  .get((req, res) => {
    const db = loadDB();
    const resource = req.params.resource.toLowerCase();
    if (!db[resource]) return res.status(404).json({ error: 'Resource not found' });
    res.json(db[resource]);
  })
  .post((req, res) => {
    const db = loadDB();
    const resource = req.params.resource.toLowerCase();
    if (!db[resource]) return res.status(404).json({ error: 'Resource not found' });

    const newItem = { ...req.body, id: getNextId(resource, db) };
    db[resource].push(newItem);
    saveDB(db);
    res.status(201).json(newItem);
  });
app.route('/mock/:resource/:id')
  .get((req, res) => {
    const db = loadDB();
    const resource = req.params.resource.toLowerCase();
    const id = parseInt(req.params.id);

    if (!db[resource]) return res.status(404).json({ error: 'Resource not found' });
    const item = db[resource].find(x => x.id === id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    res.json(item);
  })
  .patch((req, res) => {
    const db = loadDB();
    const resource = req.params.resource.toLowerCase();
    const id = parseInt(req.params.id);

    if (!db[resource]) return res.status(404).json({ error: 'Resource not found' });
    const index = db[resource].findIndex(x => x.id === id);
    if (index === -1) return res.status(404).json({ error: 'Item not found' });

    db[resource][index] = { ...db[resource][index], ...req.body };
    saveDB(db);
    res.json(db[resource][index]);
  })
  .delete((req, res) => {
    const db = loadDB();
    const resource = req.params.resource.toLowerCase();
    const id = parseInt(req.params.id);

    if (!db[resource]) return res.status(404).json({ error: 'Resource not found' });
    const index = db[resource].findIndex(x => x.id === id);
    if (index === -1) return res.status(404).json({ error: 'Item not found' });

    const removed = db[resource].splice(index, 1);
    saveDB(db);
    res.json({ message: 'Deleted', deleted: removed[0] });
  });

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 34567;
app.listen(PORT, () => {
  console.log(`✅ Server ready at http://localhost:${PORT}`);
});
