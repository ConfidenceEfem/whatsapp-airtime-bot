const sessions = new Map();

function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, { step: 'IDLE', data: {} });
  }
  return sessions.get(userId);
}

function setSession(userId, update) {
  const current = getSession(userId);
  sessions.set(userId, { ...current, ...update });
}

function clearSession(userId) {
  sessions.set(userId, { step: 'IDLE', data: {} });
}

module.exports = { getSession, setSession, clearSession };