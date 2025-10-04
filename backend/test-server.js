// Test simple du serveur backend
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Backend de test fonctionne !',
    timestamp: new Date().toISOString(),
    status: 'running'
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'API de test fonctionnelle',
    success: true
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Test server démarré sur http://0.0.0.0:${PORT}`);
});