const express = require('express');
const twilio  = require('twilio');
const { MessagingResponse } = require('twilio').twiml;
const { handleMessage }     = require('../handlers/messageHandler');

const router = express.Router();

router.post('/', async (req, res) => {

  if (process.env.NODE_ENV === 'production') {
    const signature = req.headers['x-twilio-signature'];

    // Use APP_URL from env to avoid host header issues on Render
    const url = `${process.env.APP_URL}/webhook`;

    console.log(`🔐 Validating signature for URL: ${url}`);

    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      signature,
      url,
      req.body
    );

    if (!isValid) {
      console.warn(`⚠️ Signature failed — URL used: ${url}`);
      console.warn(`⚠️ Signature received: ${signature}`);
      return res.status(403).send('Forbidden');
    }
  }

  const userId = req.body.From;
  const body   = req.body.Body || '';

  console.log(`📩 [${new Date().toISOString()}] From: ${userId} | Message: ${body}`);

  try {
    const reply = await handleMessage(userId, body);
    console.log(`📤 Sending reply: ${reply.substring(0, 60)}...`);

    const twiml = new MessagingResponse();
    twiml.message(reply);
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());

    console.log(`✅ Reply sent successfully`);
  } catch (err) {
    console.error('❌ Error in handleMessage:', err.message);
    console.error(err.stack);
    const twiml = new MessagingResponse();
    twiml.message('⚠️ Something went wrong. Type hi to restart.');
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
  }
});

module.exports = router;