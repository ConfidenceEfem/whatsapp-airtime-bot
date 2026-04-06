require('dotenv').config();
const express = require('express');
const webhookRoute = require('./routes/webhook');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use('/webhook', webhookRoute);
app.get('/', (_req, res) => res.send('AirtimeBot is running ✅'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 AirtimeBot running on port ${PORT}`));