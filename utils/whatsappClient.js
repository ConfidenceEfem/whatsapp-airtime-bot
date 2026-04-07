let clientInstance = null;

function setClient(client) {
  clientInstance = client;
}

async function sendMessage(to, body) {
  if (!clientInstance) throw new Error('WhatsApp client not initialized');
  await clientInstance.sendMessage(to, body);
  console.log(`✅ Message sent to ${to}`);
}

module.exports = { setClient, sendMessage };