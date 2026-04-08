require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { handleMessage } = require('./handlers/messageHandler');
const { setClient } = require('./utils/whatsappClient');

const client = new Client({
  authStrategy: new LocalAuth(),
   puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ],
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

client.on('auth_failure', msg => {
  console.error('❌ AUTH FAILURE:', msg);
});

client.on('disconnected', reason => {
  console.log('⚠️ Client disconnected:', reason);
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