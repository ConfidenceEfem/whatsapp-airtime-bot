require('dotenv').config();
const express = require('express');
const { handleMessage } = require('./handlers/messageHandler');
const axios = require('axios');

const app = express();
app.use(express.json());

// ── Meta webhook verification (GET) ──────────────────────────
app.get('/webhook', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log(`🔐 Verify attempt — mode: ${mode}, token: ${token}`);

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('✅ Webhook verified!');
    return res.status(200).send(challenge);
  }

  console.warn('❌ Verification failed');
  res.sendStatus(403);
});

// ── Incoming messages (POST) ──────────────────────────────────
app.post('/webhook', async (req, res) => {
  res.sendStatus(200); // Always respond fast

  try {
    const entry   = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;

    if (!value?.messages) return;

    const msg    = value.messages[0];
    if (msg.type !== 'text') return;

    const userId = msg.from;
    const body   = msg.text.body;

    console.log(`📩 ${userId}: ${body}`);

    const reply = await handleMessage(userId, body);
    console.log("Reply:", reply);
    await sendMessage(userId, reply);
    

  } catch (err) {
    console.error('❌ Webhook error:', err.message);
  }
});

// ── Send message via Meta API ─────────────────────────────────
async function sendMessage(to, body) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`✅ Message sent to ${to}`);
  } catch (err) {
    console.error('❌ Send failed:', err.response?.data || err.message);
  }
}

// ── Health check ──────────────────────────────────────────────
app.get('/', (_req, res) => res.send('AirtimeBot is running ✅'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 AirtimeBot running on port ${PORT}`));