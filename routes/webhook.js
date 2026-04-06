const express  = require('express');
const twilio   = require('twilio');
const { MessagingResponse } = require('twilio').twiml;
const { handleMessage }     = require('../handlers/messageHandler');

const router = express.Router();

router.post('/', async (req, res) => {  // ← async added here

  if (process.env.NODE_ENV === 'production') {
    const signature = req.headers['x-twilio-signature'];
    const url = `https://${req.headers.host}/webhook`;

    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      signature,
      url,
      req.body
    );

    if (!isValid) {
      console.warn('⚠️  Invalid Twilio signature — request rejected');
      return res.status(403).send('Forbidden');
    }
  }

  const userId = req.body.From;
  const body   = req.body.Body || '';

  console.log(`📩 [${new Date().toISOString()}] ${userId}: ${body}`);

  try {
    const reply = await handleMessage(userId, body);  // ← await here
    const twiml = new MessagingResponse();
    twiml.message(reply);
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
  } catch (err) {
    console.error('❌ Error handling message:', err.message);
    const twiml = new MessagingResponse();
    twiml.message('⚠️ Something went wrong. Please try again or type *hi* to restart.');
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
  }

});

module.exports = router;