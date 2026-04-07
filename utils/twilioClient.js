async function sendMessage(to, body) {
  // Lazy initialization — only load twilio when actually needed
  const twilio = require('twilio');
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!whatsappNumber) {
    throw new Error('TWILIO_WHATSAPP_NUMBER is not set in environment variables');
  }

  const toClean   = to.replace('whatsapp:', '');
  const fromClean = whatsappNumber.replace('whatsapp:', '');

  try {
    const result = await client.messages.create({
      from: `whatsapp:${fromClean}`,
      to:   `whatsapp:${toClean}`,
      body,
    });
    console.log(`✅ Message sent to ${toClean} — SID: ${result.sid}`);
  } catch (err) {
    console.error(`❌ Failed to send message to ${toClean}:`, err.message);
    throw err;
  }
}

module.exports = { sendMessage };