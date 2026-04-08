// In-memory order store — survives until server restarts
const orders = new Map();

function saveOrder(reference, orderData) {
  orders.set(reference, {
    ...orderData,
    createdAt: Date.now(),
  });
}

function getOrder(reference) {
  return orders.get(reference) || null;
}

function deleteOrder(reference) {
  orders.delete(reference);
}

module.exports = { saveOrder, getOrder, deleteOrder };