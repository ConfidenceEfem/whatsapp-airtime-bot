const express  = require('express');
const twilio   = require('twilio');
const { MessagingResponse } = require('twilio').twiml;
const { handleMessage }     = require('../handlers/messageHandler');

const router = express.Router();

router.post('/', (req, res) => {
  // Validate the request is genuinely from Twilio
  const signature = req.headers['x-twilio-signature'];
  const url       = `${req.protocol}://${req.get('host')}/webhook`;
  const isValid   = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    signature,
    url,
    req.body
  );

  if (!isValid) {
    console.warn('⚠️  Invalid Twilio signature — request rejected');
    return res.status(403).send('Forbidden');
  }

  const userId = req.body.From;   // e.g. "whatsapp:+2348012345678"
  const body   = req.body.Body || '';

  console.log(`📩 [${new Date().toISOString()}] ${userId}: ${body}`);

  const reply  = handleMessage(userId, body);
  const twiml  = new MessagingResponse();
  twiml.message(reply);

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

module.exports = router;