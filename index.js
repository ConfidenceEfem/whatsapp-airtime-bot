require('dotenv').config();
const express = require('express');
const webhookRoute = require('./routes/webhook');

const app = express();

// ← This line is critical on Render — tells Express to trust the proxy
app.set('trust proxy', true);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use('/webhook', webhookRoute);
app.get('/', (_req, res) => res.send('AirtimeBot is running ✅'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 AirtimeBot running on port ${PORT}`));