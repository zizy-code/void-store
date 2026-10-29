(() => {
  const key = 'void-cart';
  function normalize(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && window.VOID_PRODUCTS.some(product =>
      product.id === item.productId && product.sizes.includes(item.size)) &&
      Number.isSafeInteger(item.quantity) && item.quantity > 0);
  }
  const store = {
    items() { return normalize(JSON.parse(localStorage.getItem(key) || '[]')); },
    add(productId, size) {
      const product = window.VOID_PRODUCTS.find(item => item.id === productId);
      if (!product || !product.sizes.includes(size)) throw new Error('Choose an available size.');
      const cart = this.items();
      const existing = cart.find(item => item.productId === productId && item.size === size);
      if (existing) existing.quantity += 1;
      else cart.push({ productId, size, quantity: 1 });
      localStorage.setItem(key, JSON.stringify(cart));
      return cart;
    },
    remove(productId, size) {
      const cart = this.items().filter(item => item.productId !== productId || item.size !== size);
      localStorage.setItem(key, JSON.stringify(cart));
      return cart;
    }
  };
  // Only the dedicated storage document accesses localStorage for file:// pages.
  if (document.documentElement.hasAttribute('data-cart-storage')) {
    window.VOID_CART_STORE = store;
    return;
  }

  const isFile = window.location.protocol === 'file:';
  let cached = null;
  let error = null;
  let sequence = 0;
  let bridge;
  let bridgeReady;
  const pending = new Map();

  function changed() {
    window.dispatchEvent(new Event('void-cart-change'));
  }
  function createBridge() {
    bridge = document.createElement('iframe');
    bridge.hidden = true;
    bridge.title = 'Cart storage';
    bridge.setAttribute('aria-hidden', 'true');
    bridge.src = new URL('cart-storage.html', document.baseURI).href;
    bridgeReady = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Cart storage did not load.')), 10000);
      bridge.addEventListener('load', () => { clearTimeout(timer); resolve(); }, { once: true });
      bridge.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Cart storage did not load.')); }, { once: true });
    });
    window.addEventListener('message', event => {
      if (event.source !== bridge.contentWindow || event.origin !== 'null') return;
      const message = event.data;
      if (!message || message.type !== 'void-cart-response') return;
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      clearTimeout(request.timer);
      if (message.error) request.reject(new Error(message.error));
      else request.resolve(normalize(message.items));
    });
    document.body.append(bridge);
  }
  async function request(action, productId, size) {
    if (!isFile) return store[action](productId, size);
    if (!bridge) createBridge();
    await bridgeReady;
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('Cart storage did not respond.'));
      }, 10000);
      pending.set(id, { resolve, reject, timer });
      // file:// documents have opaque origins. The receiver checks event.source.
      bridge.contentWindow.postMessage({ type: 'void-cart-request', id, action, productId, size }, '*');
    });
  }
  // Serialize operations, including pageshow refreshes, so an older response
  // cannot overwrite the result of a more recent addition or removal.
  let queue = Promise.resolve();
  function run(action, productId, size) {
    const operation = queue.then(async () => {
      try {
        cached = await request(action, productId, size);
        error = null;
        changed();
        return cached.map(item => ({ ...item }));
      } catch (failure) {
        error = failure;
        changed();
        throw failure;
      }
    });
    queue = operation.catch(() => {});
    return operation;
  }
  const cart = window.VOID_CART = {
    get loading() { return cached === null && !error; },
    get error() { return error; },
    items() { return (cached || []).map(item => ({ ...item })); },
    refresh() { return run('items'); },
    add(productId, size) { return run('add', productId, size); },
    remove(productId, size) { return run('remove', productId, size); }
  };
  function updateCount() {
    const count = cart.items().reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('[data-cart-count]').forEach(node => {
      node.textContent = cart.error ? 'cart (!)' : cart.loading ? 'cart (…)' : `cart (${count})`;
    });
  }
  window.addEventListener('void-cart-change', updateCount);
  updateCount();
  cart.ready = cart.refresh();
  cart.ready.catch(() => {});
  const refresh = () => { cart.refresh().catch(() => {}); };
  // These handlers only read; a restored page never persists its cached state.
  window.addEventListener('pageshow', refresh);
  window.addEventListener('focus', refresh);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) refresh();
  });
})();
