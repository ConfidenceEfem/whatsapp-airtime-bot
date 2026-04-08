const axios = require('axios');

const BASE_URL = process.env.VTPASS_ENV === 'sandbox'
  ? 'https://sandbox.vtpass.com/api'
  : 'https://vtpass.com/api';

const AIRTIME_SERVICE_IDS = {
  mtn:      'mtn',
  airtel:   'airtel',
  glo:      'glo',
  '9mobile':'etisalat',
};

const DATA_SERVICE_IDS = {
  mtn:      'mtn-data',
  airtel:   'airtel-data',
  glo:      'glo-data',
  '9mobile':'etisalat-data',
};

async function purchaseAirtime({ network, phone, amount, requestId }) {
  try {
    const res = await axios.post(
      `${BASE_URL}/pay`,
      {
        request_id:  requestId,
        serviceID:   AIRTIME_SERVICE_IDS[network],
        amount,
        phone,
      },
      {
        headers: {
          'api-key':    process.env.VTPASS_API_KEY,
          'secret-key': process.env.VTPASS_SECRET_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const code = res.data?.code;
    if (code === '000') {
      return { success: true, data: res.data };
    } else {
      console.error('❌ VTPass airtime failed:', res.data);
      return { success: false, message: res.data?.response_description || 'Purchase failed' };
    }
  } catch (err) {
    console.error('❌ VTPass airtime error:', err.response?.data || err.message);
    return { success: false, message: err.message };
  }
}

async function purchaseData({ network, phone, bundleCode, amount, requestId }) {
  try {
    const res = await axios.post(
      `${BASE_URL}/pay`,
      {
        request_id:     requestId,
        serviceID:      DATA_SERVICE_IDS[network],
        billersCode:    phone,
        variation_code: bundleCode,
        amount,
        phone,
      },
      {
        headers: {
          'api-key':    process.env.VTPASS_API_KEY,
          'secret-key': process.env.VTPASS_SECRET_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    const code = res.data?.code;
    if (code === '000') {
      return { success: true, data: res.data };
    } else {
      console.error('❌ VTPass data failed:', res.data);
      return { success: false, message: res.data?.response_description || 'Purchase failed' };
    }
  } catch (err) {
    console.error('❌ VTPass data error:', err.response?.data || err.message);
    return { success: false, message: err.message };
  }
}

module.exports = { purchaseAirtime, purchaseData };