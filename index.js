require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('./handlers/messageHandler');
const { setClient } = require('./utils/whatsappClient');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }
});

client.on('qr', (qr) => {
  console.log('📱 Scan this QR code with your WhatsApp:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ WhatsApp bot is ready!');
  setClient(client);
});

client.on('message', async (msg) => {
  if (msg.isGroupMsg || msg.from === 'status@broadcast') return;

  const userId = msg.from;
  const body   = msg.body || '';

  console.log(`📩 [${new Date().toISOString()}] ${userId}: ${body}`);

  try {
    const reply = await handleMessage(userId, body);
    await msg.reply(reply);
    console.log('✅ Reply sent successfully');
  } catch (err) {
    console.error('❌ Error:', err.message);
    await msg.reply('⚠️ Something went wrong. Type hi to restart.');
  }
});

client.initialize();