const express  = require('express');
const twilio   = require('twilio');
const { MessagingResponse } = require('twilio').twiml;
const { handleMessage }     = require('../handlers/messageHandler');

const router = express.Router();

router.post('/', (req, res) => {

  if (process.env.NODE_ENV === 'production') {
    const signature = req.headers['x-twilio-signature'];
    
    // Build URL dynamically from the request — always matches exactly
    const url = `https://${req.headers.host}/webhook`;
    
    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN,
      signature,
      url,
      req.body
    );

    if (!isValid) {
      console.warn('⚠️  Invalid Twilio signature — request rejected');
      console.warn('URL used for validation:', url);
      return res.status(403).send('Forbidden');
    }
  }

  const userId = req.body.From;
  const body   = req.body.Body || '';

  console.log(`📩 [${new Date().toISOString()}] ${userId}: ${body}`);

  const reply  = handleMessage(userId, body);
  const twiml  = new MessagingResponse();
  twiml.message(reply);

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

module.exports = router;