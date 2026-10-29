// All local pages embed this exact file URL, so even browsers that isolate
// localStorage per file use a single storage area for the entire cart.
window.addEventListener('message', event => {
  if (window.parent === window || event.source !== window.parent || event.origin !== 'null') return;
  const message = event.data;
  if (!message || message.type !== 'void-cart-request' || !Number.isSafeInteger(message.id)) return;
  if (!['items', 'add', 'remove'].includes(message.action)) return;
  const response = { type: 'void-cart-response', id: message.id };
  try {
    response.items = window.VOID_CART_STORE[message.action](message.productId, message.size);
  } catch {
    response.error = 'Could not access cart storage. Please allow browser storage and try again.';
  }
  event.source.postMessage(response, '*');
});
