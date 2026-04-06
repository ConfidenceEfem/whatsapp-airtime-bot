const { NETWORKS } = require('./networks');

function isValidPhone(phone) {
  return /^(0[7-9][01]\d{8})$/.test(phone);
}

function isValidAmount(amount) {
  const num = parseInt(amount);
  return !isNaN(num) && num >= 50 && num <= 50000;
}

function parseOneLiner(msg) {
  // Matches: "airtime 500 mtn 08012345678" or "data 1000 airtel 08012345678"
  const parts = msg.trim().toLowerCase().split(/\s+/);
  if (parts.length < 4) return null;

  const type    = parts[0];
  const amount  = parseInt(parts[1]);
  const network = parts[2];
  const phone   = parts[3];

  if (!['airtime', 'data'].includes(type)) return null;
  if (!NETWORKS[network]) return null;
  if (!isValidAmount(amount)) return null;
  if (!isValidPhone(phone)) return null;

  return { type, amount, network, phone };
}

function detectNetwork(text) {
  const t = text.toLowerCase();
  if (t.includes('mtn'))     return 'mtn';
  if (t.includes('airtel'))  return 'airtel';
  if (t.includes('glo'))     return 'glo';
  if (t.includes('9mobile')) return '9mobile';
  return null;
}

module.exports = { isValidPhone, isValidAmount, parseOneLiner, detectNetwork };