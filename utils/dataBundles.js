const axios = require('axios');

const BASE_URL = process.env.VTPASS_ENV === 'sandbox'
  ? 'https://sandbox.vtpass.com/api'
  : 'https://vtpass.com/api';

const SERVICE_IDS = {
  mtn:      'mtn-data',
  airtel:   'airtel-data',
  glo:      'glo-data',
  '9mobile':'etisalat-data',
};

// Cache bundles for 1 hour so we don't hammer the API
const cache = {};
const CACHE_TTL = 60 * 60 * 1000;

async function fetchBundles(network) {
  const serviceID = SERVICE_IDS[network.toLowerCase()];
  if (!serviceID) return null;

  const now = Date.now();
  if (cache[network] && (now - cache[network].timestamp) < CACHE_TTL) {
    return cache[network].data;
  }

  try {
    const res = await axios.get(`${BASE_URL}/service-variations`, {
      params: { serviceID },
      headers: {
        'api-key':    process.env.VTPASS_API_KEY,
        'public-key': process.env.VTPASS_PUBLIC_KEY,
      },
    });

    const variations = res.data?.content?.varations;
    if (!variations || !variations.length) return null;

    // Clean up the data into a simple format
    const bundles = variations.map((v, i) => ({
      index:   i + 1,
      code:    v.variation_code,
      name:    v.name,
      amount:  parseFloat(v.variation_amount),
    }));

    cache[network] = { timestamp: now, data: bundles };
    return bundles;

  } catch (err) {
    console.error(`❌ Failed to fetch bundles for ${network}:`, err.message);
    return null;
  }
}

function formatBundleMenu(bundles, network) {
  const NETWORKS = { mtn: 'MTN', airtel: 'Airtel', glo: 'Glo', '9mobile': '9mobile' };
  let menu = `📡 *${NETWORKS[network]} Data Bundles*\n━━━━━━━━━━━━━━━\n`;
  bundles.forEach(b => {
    menu += `${b.index}️⃣ ${b.name} — ₦${b.amount}\n`;
  });
  menu += `━━━━━━━━━━━━━━━\nReply with a number to select.\n\nOr type a custom amount (e.g. *500*)\n\n_Type *cancel* to start over_`;
  return menu;
}

module.exports = { fetchBundles, formatBundleMenu };