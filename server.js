require('dotenv').config({ path: './.env' });
const express = require('express');

const app = express();

const readRoutes = require('./routes/read');
const writeRoutes = require('./routes/write');

app.use(express.json());

app.use('/read', readRoutes);
app.use('/write', writeRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'API is running' });
});

const PORT = process.env.PORT || 5173;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API running on port ${PORT}`);
});


