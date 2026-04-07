const express = require('express');
const { handleMessage } = require('../handlers/messageHandler');

const router = express.Router();

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

// Meta sends a GET request to verify your webhook
router.get('/', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified by Meta');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// Meta sends a POST request for every incoming message
router.post('/', async (req, res) => {
  // Acknowledge receipt immediately — Meta needs this fast
  res.sendStatus(200);

  try {
    const entry   = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;

    // Ignore delivery receipts and other non-message events
    if (!value?.messages) return;

    const msg    = value.messages[0];
    const userId = msg.from; // e.g. "2348012345678"
    const body   = msg.text?.body || '';

    if (!body) return;

    console.log(`📩 [${new Date().toISOString()}] ${userId}: ${body}`);

    const reply = await handleMessage(userId, body);

    const { sendMessage } = require('../utils/metaClient');
    await sendMessage(userId, reply);

  } catch (err) {
    console.error('❌ Webhook error:', err.message);
  }
});

module.exports = router;