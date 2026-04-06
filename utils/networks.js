const NETWORKS = {
  mtn: 'MTN',
  airtel: 'Airtel',
  glo: 'Glo',
  '9mobile': '9mobile',
};

const DATA_BUNDLES = {
  mtn:     [{ amount: 100, data: '100MB' }, { amount: 200, data: '200MB' }, { amount: 500, data: '1GB'  }, { amount: 1000, data: '2GB'  }, { amount: 2000, data: '5GB'  }, { amount: 3000, data: '10GB' }],
  airtel:  [{ amount: 100, data: '100MB' }, { amount: 200, data: '300MB' }, { amount: 500, data: '1GB'  }, { amount: 1000, data: '2GB'  }, { amount: 2000, data: '5GB'  }, { amount: 3000, data: '10GB' }],
  glo:     [{ amount: 100, data: '200MB' }, { amount: 200, data: '500MB' }, { amount: 500, data: '1.5GB'}, { amount: 1000, data: '3GB'  }, { amount: 2000, data: '7GB'  }, { amount: 3000, data: '12GB' }],
  '9mobile':[{ amount: 100, data: '100MB' }, { amount: 200, data: '200MB' }, { amount: 500, data: '1GB'  }, { amount: 1000, data: '1.5GB'}, { amount: 2000, data: '4GB'  }, { amount: 3000, data: '8GB'  }],
};

function getDataBundle(network, amount) {
  const bundles = DATA_BUNDLES[network.toLowerCase()];
  if (!bundles) return null;
  // find exact match or closest bundle at or below the amount
  const match = [...bundles].reverse().find(b => b.amount <= amount);
  return match || null;
}

module.exports = { NETWORKS, DATA_BUNDLES, getDataBundle };