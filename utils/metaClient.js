const axios = require('axios');

const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const ACCESS_TOKEN    = process.env.META_ACCESS_TOKEN;

async function sendMessage(to, body) {
  // Strip whatsapp: prefix if present
  const toNumber = to.replace('whatsapp:', '');

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: toNumber,
        type: 'text',
        text: { body },
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`✅ Message sent to ${toNumber} — ID: ${res.data.messages?.[0]?.id}`);
  } catch (err) {
    console.error(`❌ Failed to send message:`, err.response?.data || err.message);
    throw err;
  }
}

module.exports = { sendMessage };