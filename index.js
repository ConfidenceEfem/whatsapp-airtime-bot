require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const { handleMessage } = require('./handlers/messageHandler');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (_req, res) => res.send('AirtimeBot is running ✅'));

app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  console.log("message now")

  try {
    const msg  = req.body;
    const from = msg.from;
    const body = msg.body || '';

    // Ignore non-text and group messages
    if (!from || !body || from.includes('@g.us')) return;
    if (msg.type !== 'chat') return;

    console.log(`📩 ${from}: ${body}`);

    const reply = await handleMessage(from, body);
    await sendMessage(from, reply);

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
});

async function sendMessage(to, body) {
  const instance = process.env.ULTRAMSG_INSTANCE_ID;
  const token    = process.env.ULTRAMSG_TOKEN;
console.log("before sending message")
  try {
    await axios.post(
      `https://api.ultramsg.com/${instance}/messages/chat`,
      { token, to, body },
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log(`✅ Message sent to ${to}`);
  } catch (err) {
    console.error('❌ Send failed:', err.response?.data || err.message);
  }
}

// Export so messageHandler can use it for bundle sending
module.exports = { sendMessage };

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 AirtimeBot running on port ${PORT}`));