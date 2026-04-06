const { getSession, setSession, clearSession } = require('../utils/sessionManager');
const { parseOneLiner, isValidPhone, isValidAmount, detectNetwork } = require('../utils/validator');
const { NETWORKS } = require('../utils/networks');
const { fetchBundles, formatBundleMenu } = require('../utils/dataBundles');

const NETWORK_MAP = { '1': 'mtn', '2': 'airtel', '3': 'glo', '4': '9mobile' };

const NETWORK_MENU = `Which network?
1️⃣ MTN
2️⃣ Airtel
3️⃣ Glo
4️⃣ 9mobile

Reply with a number or network name.
_Type *cancel* to start over_`;

async function handleMessage(userId, rawMsg) {
  const msg    = rawMsg.trim();
  const msgLow = msg.toLowerCase();
  const session = getSession(userId);

  // ── CANCEL / MENU reset anytime ───────────────────────────────
  if (['cancel', 'stop', 'exit', 'menu', 'back', '0'].includes(msgLow)) {
    clearSession(userId);
    return mainMenu();
  }

  // ── ONE-LINER shortcut ────────────────────────────────────────
  const oneLiner = parseOneLiner(msgLow);
  if (oneLiner) {
    const { type, amount, network, phone } = oneLiner;

    if (type === 'data') {
      const bundles = await fetchBundles(network);
      const bundle  = bundles
        ? [...bundles].reverse().find(b => b.amount <= amount)
        : null;

      if (!bundle) {
        return `❌ No data bundle found for ₦${amount} on ${NETWORKS[network]}.\n\nSend *data* to browse available bundles.`;
      }

      const summary = buildSummary({ type, network, amount: bundle.amount, phone, bundleName: bundle.name, bundleCode: bundle.code });
      setSession(userId, { step: 'AWAITING_CONFIRM', data: { type, network, amount: bundle.amount, phone, bundleName: bundle.name, bundleCode: bundle.code } });
      return `${summary}\n\nReply *YES* to confirm and pay, or *NO* to cancel.`;
    }

    const summary = buildSummary({ type, network, amount, phone });
    setSession(userId, { step: 'AWAITING_CONFIRM', data: oneLiner });
    return `${summary}\n\nReply *YES* to confirm and pay, or *NO* to cancel.`;
  }

  // ── STEP MACHINE ──────────────────────────────────────────────
  switch (session.step) {

    case 'IDLE': {
      if (msgLow === 'airtime') {
        setSession(userId, { step: 'AWAITING_NETWORK', data: { type: 'airtime' } });
        return NETWORK_MENU;
      }
      if (msgLow === 'data') {
        setSession(userId, { step: 'AWAITING_NETWORK', data: { type: 'data' } });
        return NETWORK_MENU;
      }
      // Any other message → show menu and move to AWAITING_SERVICE
      setSession(userId, { step: 'AWAITING_SERVICE', data: {} });
      return mainMenu();
    }

    case 'AWAITING_SERVICE': {
      if (msgLow === '1' || msgLow === 'airtime') {
        setSession(userId, { step: 'AWAITING_NETWORK', data: { type: 'airtime' } });
        return NETWORK_MENU;
      }
      if (msgLow === '2' || msgLow === 'data') {
        setSession(userId, { step: 'AWAITING_NETWORK', data: { type: 'data' } });
        return NETWORK_MENU;
      }
      return `Please reply with *1* for Airtime or *2* for Data.\n\n_Type *cancel* to start over_`;
    }

    case 'AWAITING_NETWORK': {
  const network = NETWORK_MAP[msgLow] || detectNetwork(msgLow);
  if (!network) return `❌ Network not recognised.\n\n${NETWORK_MENU}`;

  setSession(userId, { step: 'AWAITING_AMOUNT', data: { ...session.data, network } });

  if (session.data.type === 'data') {
    // ✅ Save network in session immediately
    setSession(userId, { step: 'AWAITING_BUNDLE_CHOICE', data: { ...session.data, network, bundles: [] } });

    // ✅ Fetch bundles in background and send separately — don't await here
    fetchAndSendBundles(userId, network).catch(err =>
      console.error('❌ fetchAndSendBundles error:', err.message)
    );

    // ✅ Respond to Twilio immediately so it doesn't time out
    return `⏳ Fetching *${NETWORKS[network]}* data bundles, please wait a moment...`;
  }

  return `💰 How much airtime? (e.g. 100, 200, 500)\n\nMin: ₦50 | Max: ₦50,000\n\n_Type *cancel* to start over_`;
}

    case 'AWAITING_BUNDLE_CHOICE': {
      const { network, bundles } = session.data;
      const choiceNum = parseInt(msgLow);

      // User picked a number from the list
      if (!isNaN(choiceNum) && choiceNum >= 1 && choiceNum <= bundles.length) {
        const bundle = bundles[choiceNum - 1];
        setSession(userId, { step: 'AWAITING_PHONE', data: { ...session.data, amount: bundle.amount, bundleName: bundle.name, bundleCode: bundle.code } });
        return `📱 What phone number should receive *${bundle.name}*?\n\n(e.g. 08012345678)\n\n_Type *cancel* to start over_`;
      }

      // User typed a custom amount
      const customAmount = parseInt(msgLow);
      if (!isNaN(customAmount) && isValidAmount(customAmount)) {
        const match = [...bundles].reverse().find(b => b.amount <= customAmount);
        if (!match) {
          return `❌ No bundle available for ₦${customAmount}.\n\nPlease pick from the list or try a different amount.\n\n_Type *cancel* to start over_`;
        }
        setSession(userId, { step: 'AWAITING_PHONE', data: { ...session.data, amount: match.amount, bundleName: match.name, bundleCode: match.code } });
        return `📦 Closest bundle: *${match.name}* for ₦${match.amount}\n\n📱 What number should receive this data?\n\n_Type *cancel* to start over_`;
      }

      return `❌ Invalid choice. Pick a number from the list or type a custom amount.\n\n_Type *cancel* to start over_`;
    }

    case 'AWAITING_AMOUNT': {
      // This is only for airtime now
      const amount = parseInt(msgLow);
      if (!isValidAmount(amount)) {
        return `❌ Enter a valid amount between ₦50 and ₦50,000.\n\n_Type *cancel* to start over_`;
      }
      setSession(userId, { step: 'AWAITING_PHONE', data: { ...session.data, amount } });
      return `📱 What number should receive ₦${amount} airtime?\n\n(e.g. 08012345678)\n\n_Type *cancel* to start over_`;
    }

    case 'AWAITING_PHONE': {
      const phone = msgLow.replace(/\s+/g, '');
      if (!isValidPhone(phone)) {
        return `❌ Invalid number. Enter a valid Nigerian number e.g. 08012345678\n\n_Type *cancel* to start over_`;
      }
      const d = { ...session.data, phone };
      setSession(userId, { step: 'AWAITING_CONFIRM', data: d });
      return `${buildSummary(d)}\n\nReply *YES* to confirm and pay, or *NO* to cancel.`;
    }

    case 'AWAITING_CONFIRM': {
      if (msgLow === 'yes') {
        const d = session.data;
        clearSession(userId);
        // 🔜 Paystack payment link goes here next
        const item = d.type === 'data' ? d.bundleName : `₦${d.amount} airtime`;
        return `✅ Order confirmed!\n\nProcessing *${item}* for *${d.phone}* on *${NETWORKS[d.network]}*.\n\n💳 Payment link coming soon...\n\n_Send *hi* to place a new order_`;
      }
      if (msgLow === 'no') {
        clearSession(userId);
        return `❌ Order cancelled.\n\n${mainMenu()}`;
      }
      return `Please reply *YES* to confirm or *NO* to cancel.`;
    }

    default:
      clearSession(userId);
      return mainMenu();
  }
}

function mainMenu() {
  return `👋 Welcome to *AirtimeBot* 🇳🇬

What would you like to do?
1️⃣ Buy Airtime
2️⃣ Buy Data

Reply with *1* or *2*, or type directly:
- *airtime* — buy airtime
- *data* — buy data

Or send everything at once:
_airtime 500 mtn 08012345678_
_data 1000 airtel 08012345678_`;
}

function buildSummary({ type, network, amount, phone, bundleName }) {
  return `📋 *Order Summary*
━━━━━━━━━━━━━━━
Type:     ${type === 'data' ? '📡 Data' : '📶 Airtime'}
Network:  ${NETWORKS[network]}
${type === 'data' ? `Bundle:   ${bundleName}` : `Amount:   ₦${amount}`}
Phone:    ${phone}
Cost:     ₦${amount}
━━━━━━━━━━━━━━━`;
}

async function fetchAndSendBundles(userId, network) {
  const { sendMessage } = require('../utils/twilioClient');

  const bundles = await fetchBundles(network);

  if (!bundles || bundles.length === 0) {
    setSession(userId, { step: 'AWAITING_BUNDLE_CHOICE', data: { ...getSession(userId).data, bundles: [] } });
    await sendMessage(userId, `⚠️ Couldn't load bundles for ${NETWORKS[network]} right now.\n\nPlease type an amount manually (e.g. *500*)\n\n_Type *cancel* to start over_`);
    return;
  }

  // Update session with real bundles now that we have them
  const currentSession = getSession(userId);
  setSession(userId, {
    step: 'AWAITING_BUNDLE_CHOICE',
    data: { ...currentSession.data, bundles }
  });

  await sendMessage(userId, formatBundleMenu(bundles, network));
}

module.exports = { handleMessage };