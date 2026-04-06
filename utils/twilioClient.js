const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendMessage(to, body) {
  try {
    // Strip whatsapp: prefix if already there, then re-add cleanly
    const toClean   = to.replace('whatsapp:', '');
    const fromClean = process.env.TWILIO_WHATSAPP_NUMBER.replace('whatsapp:', '');

    const result = await client.messages.create({
      from: `whatsapp:${fromClean}`,
      to:   `whatsapp:${toClean}`,
      body,
    });

    console.log(`✅ Message sent to ${toClean} — SID: ${result.sid}`);
  } catch (err) {
    console.error(`❌ Failed to send message to ${to}:`, err.message);
    throw err;
  }
}

module.exports = { sendMessage };