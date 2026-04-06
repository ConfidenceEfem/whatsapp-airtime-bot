const { getSession, setSession, clearSession } = require('../utils/sessionManager');
const { parseOneLiner, isValidPhone, isValidAmount, detectNetwork } = require('../utils/validator');
const { NETWORKS, getDataBundle } = require('../utils/networks');

const NETWORK_MENU = `Which network?
1️⃣ MTN
2️⃣ Airtel
3️⃣ Glo
4️⃣ 9mobile

Reply with the number or network name.`;

const NETWORK_MAP = { '1': 'mtn', '2': 'airtel', '3': 'glo', '4': '9mobile' };

function handleMessage(userId, rawMsg) {
  const msg     = rawMsg.trim();
  const msgLow  = msg.toLowerCase();
  const session = getSession(userId);

  // ── CANCEL anytime ───────────────────────────────────────────
  if (['cancel', 'stop', 'exit', 'menu'].includes(msgLow)) {
    clearSession(userId);
    return mainMenu();
  }

  // ── ONE-LINER shortcut ────────────────────────────────────────
  const oneLiner = parseOneLiner(msgLow);
  if (oneLiner) {
    const { type, amount, network, phone } = oneLiner;
    let summary = '';

    if (type === 'data') {
      const bundle = getDataBundle(network, amount);
      if (!bundle) return `❌ No data bundle available for ₦${amount} on ${NETWORKS[network]}. Try a different amount.`;
      summary = buildSummary({ type, network, amount: bundle.amount, phone, dataSize: bundle.data });
    } else {
      summary = buildSummary({ type, network, amount, phone });
    }

    setSession(userId, { step: 'AWAITING_CONFIRM', data: oneLiner });
    return `${summary}\n\nReply *YES* to confirm or *NO* to cancel.`;
  }

  // ── STEP MACHINE ──────────────────────────────────────────────
  switch (session.step) {

    case 'IDLE': {
      // Direct keyword shortcuts
      if (msgLow === 'airtime') {
        setSession(userId, { step: 'AWAITING_NETWORK', data: { type: 'airtime' } });
        return NETWORK_MENU;
      }
      if (msgLow === 'data') {
        setSession(userId, { step: 'AWAITING_NETWORK', data: { type: 'data' } });
        return NETWORK_MENU;
      }
      // Any greeting or first message → show main menu
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
      return `Please reply with *1* for Airtime or *2* for Data.`;
    }

    case 'AWAITING_NETWORK': {
      const network = NETWORK_MAP[msgLow] || detectNetwork(msgLow);
      if (!network) return `❌ Network not recognised.\n\n${NETWORK_MENU}`;
      setSession(userId, { step: 'AWAITING_AMOUNT', data: { ...session.data, network } });
      return session.data.type === 'airtime'
        ? `💰 How much airtime? (e.g. 100, 200, 500)\n\nMinimum: ₦50 | Maximum: ₦50,000`
        : `💰 How much do you want to spend on data? (e.g. 500, 1000, 2000)`;
    }

    case 'AWAITING_AMOUNT': {
      const amount = parseInt(msgLow);
      if (!isValidAmount(amount)) return `❌ Enter a valid amount between ₦50 and ₦50,000.`;

      if (session.data.type === 'data') {
        const bundle = getDataBundle(session.data.network, amount);
        if (!bundle) return `❌ No bundle for ₦${amount} on ${NETWORKS[session.data.network]}.\n\nTry: ₦100, ₦200, ₦500, ₦1000, ₦2000, or ₦3000.`;
        setSession(userId, { step: 'AWAITING_PHONE', data: { ...session.data, amount: bundle.amount, dataSize: bundle.data } });
        return `📦 You'll get *${bundle.data}* for ₦${bundle.amount} on ${NETWORKS[session.data.network]}.\n\n📱 What phone number should receive this data?`;
      }

      setSession(userId, { step: 'AWAITING_PHONE', data: { ...session.data, amount } });
      return `📱 What phone number should receive ₦${amount} airtime? (e.g. 08012345678)`;
    }

    case 'AWAITING_PHONE': {
      const phone = msgLow.replace(/\s+/g, '');
      if (!isValidPhone(phone)) return `❌ Invalid phone number. Enter a valid Nigerian number (e.g. 08012345678).`;

      const d = { ...session.data, phone };
      setSession(userId, { step: 'AWAITING_CONFIRM', data: d });
      return `${buildSummary(d)}\n\nReply *YES* to confirm and pay, or *NO* to cancel.`;
    }

    case 'AWAITING_CONFIRM': {
      if (msgLow === 'yes') {
        const d = session.data;
        clearSession(userId);
        // 🔜 Payment + VTPass integration goes here
        return `✅ Order received! Processing your ${d.type === 'data' ? d.dataSize + ' data' : '₦' + d.amount + ' airtime'} for ${d.phone} on ${NETWORKS[d.network]}.\n\n💳 Payment link coming soon...\n\nSend *hi* to start a new order.`;
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

Reply with *1* or *2*, or just type:
- *airtime* to buy airtime
- *data* to buy data
- Or send everything at once, e.g:
  _airtime 500 mtn 08012345678_
  _data 1000 airtel 08012345678_`;
}

function buildSummary({ type, network, amount, phone, dataSize }) {
  return `📋 *Order Summary*
━━━━━━━━━━━━━━━
Type:    ${type === 'data' ? '📡 Data' : '📶 Airtime'}
Network: ${NETWORKS[network]}
${type === 'data' ? `Bundle:  ${dataSize}` : `Amount:  ₦${amount}`}
Phone:   ${phone}
Cost:    ₦${amount}
━━━━━━━━━━━━━━━`;
}

module.exports = { handleMessage };