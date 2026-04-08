const axios = require('axios');

async function generatePaymentLink({ amount, email, phone, reference, metadata }) {
  try {
    const res = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        amount:    amount * 100, // Paystack uses kobo
        email,
        reference,
        metadata,
        callback_url: `${process.env.APP_URL}/payment/verify`,
        channels: ['card', 'bank', 'ussd', 'mobile_money'],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return res.data.data.authorization_url;
  } catch (err) {
    console.error('❌ Paystack init failed:', err.response?.data || err.message);
    throw err;
  }
}

async function verifyPayment(reference) {
  try {
    const res = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      }
    );
    return res.data.data;
  } catch (err) {
    console.error('❌ Paystack verify failed:', err.response?.data || err.message);
    throw err;
  }
}

module.exports = { generatePaymentLink, verifyPayment };