require('dotenv').config();
const express  = require('express');
const crypto   = require('crypto');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode   = require('qrcode-terminal');
const qrcodeForImage = require('qrcode');
const puppeteer = require('puppeteer');
const { handleMessage }            = require('./handlers/messageHandler');
const { setClient }                = require('./utils/whatsappClient');
const { verifyPayment }            = require('./utils/paystack');
const { getOrder, deleteOrder }    = require('./utils/orderStore');
const { purchaseAirtime, purchaseData } = require('./utils/vtpass');
const { NETWORKS }                 = require('./utils/networks');

// ── Express app (for Paystack webhook) ───────────────────────
const app = express();

app.get('/', (_req, res) => res.send('AirtimeBot is running ✅'));

// ⚠️ This must come BEFORE express.json() — Paystack needs raw body
app.post('/payment/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(req.body)
    .digest('hex');

  if (hash !== req.headers['x-paystack-signature']) {
    console.warn('⚠️ Invalid Paystack signature');
    return res.sendStatus(403);
  }

  res.sendStatus(200);

  const event = JSON.parse(req.body);
  if (event.event !== 'charge.success') return;

  const reference = event.data.reference;
  console.log(`💰 Payment received: ${reference}`);

  const order = getOrder(reference);
  if (!order) {
    console.warn(`⚠️ No order found for: ${reference}`);
    return;
  }

  try {
    const payment = await verifyPayment(reference);
    if (payment.status !== 'success') return;

    console.log(`✅ Payment verified — fulfilling order...`);

    const requestId = `${Date.now()}-${reference}`;
    let result;

    if (order.type === 'airtime') {
      result = await purchaseAirtime({
        network:   order.network,
        phone:     order.phone,
        amount:    order.amount,
        requestId,
      });
    } else {
      result = await purchaseData({
        network:    order.network,
        phone:      order.phone,
        bundleCode: order.bundleCode,
        amount:     order.amount,
        requestId,
      });
    }

    const item = order.type === 'data' ? order.bundleName : `₦${order.amount} airtime`;

    if (result.success) {
      deleteOrder(reference);
      await sendWhatsAppMessage(order.userId,
        `🎉 *Success!*\n\nYour *${item}* has been sent to *${order.phone}* on *${NETWORKS[order.network]}*!\n\nReference: ${reference}\n\nThank you for using AirtimeBot! 🇳🇬\nType *hi* to place another order.`
      );
    } else {
      await sendWhatsAppMessage(order.userId,
        `⚠️ *Payment received but delivery failed.*\n\nDon't worry — your money is safe. Contact support with reference:\n*${reference}*\n\nWe will resolve this immediately.`
      );
    }

  } catch (err) {
    console.error('❌ Fulfillment error:', err.message);
  }
});

app.use(express.json());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Express server running on port ${PORT}`));

// ── WhatsApp client ───────────────────────────────────────────


const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: puppeteer.executablePath(),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      //    '--no-zygote',
      // '--single-process'
    ],
  }
});

client.on('qr', async (qr) => {

  console.log('📱 Scan this QR code with your WhatsApp:');
  qrcode.generate(qr, { small: false });
});

client.on('ready', () => {
  console.log('✅ WhatsApp bot is ready!');
  setClient(client);
});

client.on('auth_failure', msg => {
  console.error('❌ Auth failure:', msg);
});

client.on('disconnected', reason => {
  console.warn('⚠️ Disconnected:', reason);
});

client.on('message', async (msg) => {
  if (msg.isGroupMsg || msg.from === 'status@broadcast') return;

  const userId = msg.from;
  const body   = msg.body || '';

  console.log(`📩 [${new Date().toISOString()}] ${userId}: ${body}`);

  try {
    const reply = await handleMessage(userId, body);
    await msg.reply(reply);
    console.log('✅ Reply sent');
  } catch (err) {
    console.error('❌ Error:', err.message);
    await msg.reply('⚠️ Something went wrong. Type hi to restart.');
  }
});

client.initialize();

// ── Helper to send proactive WhatsApp messages ────────────────
async function sendWhatsAppMessage(to, body) {
  try {
    const { sendMessage } = require('./utils/whatsappClient');
    await sendMessage(to, body);
  } catch (err) {
    console.error('❌ Failed to send WhatsApp message:', err.message);
  }
}