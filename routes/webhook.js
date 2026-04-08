const express = require('express');
const router  = express.Router();

// Webhook no longer used — bot runs via whatsapp-web.js
router.get('/', (_req, res) => res.send('Bot is running via whatsapp-web.js'));

module.exports = router;