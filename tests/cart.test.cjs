// Run: node tests/cart.test.cjs
const fs = require('node:fs');
const { URL, URLSearchParams } = require('node:url');
const sources = Object.fromEntries(['products', 'cart', 'cart-storage', 'cart-page', 'product'].map(name =>
  [name, fs.readFileSync(`${__dirname}/../js/${name}.js`, 'utf8')]));
function assert(value, message) { if (!value) throw new Error(message); }
function storage() {
  return { data: new Map(), writes: 0, blocked: false,
    getItem(key) { if (this.blocked) throw Error('Denied'); return this.data.get(key) ?? null; },
    setItem(key, value) { if (this.blocked) throw Error('Denied'); this.writes++; this.data.set(key, value); }
  };
}
function emitter(object = {}) {
  const events = {};
  object.addEventListener = (name, listener, options) => {
    (events[name] ||= []).push({ listener, once: options?.once });
  };
  object.dispatchEvent = event => {
    for (const item of [...(events[event.type] || [])]) {
      if (item.once) events[event.type].splice(events[event.type].indexOf(item), 1);
      item.listener(event);
    }
  };
  return object;
}
function element() {
  let text = '';
  return emitter({ children: [], attrs: {},
    set textContent(value) { text = value; this.children = []; },
    get textContent() { return text; },
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { text = ''; this.children = children; },
    setAttribute(key, value) { this.attrs[key] = value; },
    querySelector() { return null; }, focus() {}
  });
}
function environment() {
  const buckets = new Map();
  function bucket(href) {
    const url = new URL(href);
    // Deliberately isolate every file AND query string. HTTP uses a shared origin.
    const key = url.protocol === 'file:' ? url.href.split('#')[0] : url.origin;
    if (!buckets.has(key)) buckets.set(key, storage());
    return buckets.get(key);
  }
  function page(href) {
    const ownStorage = bucket(href);
    const window = emitter({ location: new URL(href), name: '' });
    const nodes = Object.fromEntries(['[data-cart-count]', '[data-cart-items]', '[data-cart-total]', '[data-cart-feedback]'].map(key => [key, element()]));
    const frames = [];
    const document = {
      baseURI: href,
      documentElement: { hasAttribute() { return false; } },
      querySelectorAll() { return [nodes['[data-cart-count]']]; },
      querySelector(key) { return nodes[key]; },
      createElement() { return element(); },
      body: { append(frame) {
        frames.push(frame);
        const bridge = emitter({});
        const proxy = { postMessage(data) {
          queueMicrotask(() => bridge.dispatchEvent({ type: 'message', source: bridge.parent, origin: 'null', data }));
        } };
        bridge.parent = { postMessage(data) {
          queueMicrotask(() => window.dispatchEvent({ type: 'message', source: proxy, origin: 'null', data }));
        } };
        frame.contentWindow = proxy;
        const bridgeDocument = { documentElement: { hasAttribute() { return true; } } };
        execute('products', bridge, bridgeDocument, bucket(frame.src));
        execute('cart', bridge, bridgeDocument, bucket(frame.src));
        execute('cart-storage', bridge, bridgeDocument, bucket(frame.src));
        queueMicrotask(() => frame.dispatchEvent({ type: 'load' }));
      } }
    };
    function execute(name, target = window, doc = document, saved = ownStorage) {
      new Function('window', 'document', 'localStorage', 'URL', 'Event', 'setTimeout', 'clearTimeout', sources[name])(
        target, doc, saved, URL, Event, setTimeout, clearTimeout);
    }
    execute('products'); execute('cart');
    return {
      window, cart: window.VOID_CART, nodes, frames, ownStorage,
      renderCart() { execute('cart-page'); },
      async show(persisted) {
        window.dispatchEvent({ type: 'pageshow', persisted });
        await window.VOID_CART.refresh().catch(() => {});
      },
      async event(type, extra = {}) {
        window.dispatchEvent({ type, ...extra });
        await window.VOID_CART.refresh().catch(() => {});
      }
    };
  }
  return { page, bucket };
}
async function scenario(base) {
  const env = environment();
  const home = env.page(`${base}index.html`);
  const catalog = env.page(`${base}catalog.html`);
  const product = env.page(`${base}product.html?id=1`);
  const otherProduct = env.page(`${base}product.html?id=2`);
  const cart = env.page(`${base}cart.html`);
  cart.renderCart();
  assert(cart.nodes['[data-cart-items]'].textContent === 'Loading your cart…', 'Do not display a false empty cart during initialization');
  await Promise.all([home.cart.ready, catalog.cart.ready, product.cart.ready, otherProduct.cart.ready, cart.cart.ready]);
  const saved = env.bucket(base.startsWith('file:') ? `${base}cart-storage.html` : `${base}cart.html`);
  assert(saved.writes === 0, 'Initialization does not write an empty cart');
  await product.cart.add('1', 'M');
  await otherProduct.cart.add('2', 'S');
  await product.cart.add('1', 'M');
  await Promise.all([home.show(true), catalog.show(true), cart.show(true), otherProduct.show(true)]);
  assert(cart.cart.items().length === 2, 'Different product pages use one cart');
  assert(cart.cart.items()[0].quantity === 2, 'Quantities survive navigation');
  for (const page of [home, catalog, cart, otherProduct]) {
    assert(page.nodes['[data-cart-count]'].textContent === 'cart (3)', 'Counters agree after history navigation');
  }
  assert(cart.nodes['[data-cart-items]'].children.length === 2, 'Cached cart renders the latest rows');
  assert(cart.nodes['[data-cart-total]'].textContent === `Total · ${cart.window.VOID_MONEY(415)}`, 'Cached cart renders the latest total');
  const writes = saved.writes;
  const stale = env.page(`${base}catalog.html#void-cart=%5B%5D`);
  stale.window.name = 'void-cart:[]';
  await stale.cart.ready; await stale.show(false);
  const reload = env.page(`${base}cart.html`); reload.renderCart();
  await reload.cart.ready;
  assert(reload.cart.items().length === 2, 'Reload preserves the cart');
  assert(stale.cart.items().length === 2, 'Stale URL and window.name cannot override storage');
  assert(saved.writes === writes, 'pageshow, reload and rendering never write to storage');
  await reload.cart.remove('1', 'M');
  await product.show(true); await cart.show(true);
  assert(product.cart.items().length === 1, 'Back does not resurrect a removed size');
  assert(cart.nodes['[data-cart-items]'].children.length === 1, 'Cached rows update after removal');
  await reload.cart.remove('2', 'S');
  await cart.show(true);
  assert(cart.cart.items().length === 0 && cart.nodes['[data-cart-total]'].textContent === '', 'Empty cart and total survive history navigation');
  await Promise.all([product.cart.add('1', 'S'), product.cart.add('1', 'L'), product.cart.refresh()]);
  await cart.event('focus');
  assert(cart.cart.items().length === 2, 'Queued refresh cannot overwrite a later addition');
  assert(cart.nodes['[data-cart-count]'].textContent === 'cart (2)', 'Focus refreshes the count');
  let rejected = false;
  try { await product.cart.add('1', 'invalid'); } catch { rejected = true; }
  assert(rejected, 'Invalid sizes reject the addition');
  if (base.startsWith('file:')) {
    for (const page of [home, catalog, product, otherProduct, cart, reload]) {
      assert(page.ownStorage.writes === 0, 'No cart data is written into isolated page storage');
      assert(page.frames[0].src === `${base}cart-storage.html`, 'All pages embed the same storage URL');
    }
  }
  saved.blocked = true;
  rejected = false;
  try { await product.cart.add('1', 'XL'); } catch { rejected = true; }
  assert(rejected && product.cart.error, 'Storage failure is reported instead of success');
  await cart.show(true);
  assert(cart.nodes['[data-cart-items]'].textContent.includes('Could not load'), 'Storage error is not disguised as an empty cart');
  saved.blocked = false;
  await cart.show(true);
  assert(cart.cart.items().length === 2 && !cart.cart.error, 'Refreshing recovers after storage access is restored');
}
async function productFeedback() {
  const selectors = Object.fromEntries(['img', 'h1', '[data-color]', '[data-price]', '[data-description]', '[data-sizes]', '[data-feedback]'].map(key => [key, element()]));
  const button = element();
  const handlers = {};
  const form = {
    querySelector() { return button; },
    addEventListener(name, handler) { handlers[name] = handler; }
  };
  selectors.form = form;
  const content = { querySelector(key) { return selectors[key]; } };
  const document = {
    querySelector(key) { return key === '[data-product]' ? content : element(); },
    createElement: element
  };
  let acknowledge;
  const window = { location: { search: '?id=1' }, VOID_CART: {
    ready: Promise.resolve(), add() { return new Promise(resolve => { acknowledge = resolve; }); }
  } };
  new Function('window', sources.products)(window);
  new Function('window', 'document', 'URLSearchParams', 'FormData', sources.product)(
    window, document, URLSearchParams, class FormData { get() { return 'M'; } });
  await window.VOID_CART.ready;
  const operation = handlers.submit({ preventDefault() {} });
  assert(button.disabled && !selectors['[data-feedback]'].textContent.includes('added'), 'Product waits for storage acknowledgement');
  acknowledge([]);
  await operation;
  assert(!button.disabled && selectors['[data-feedback]'].textContent.includes('added'), 'Success appears only after acknowledgement');
  window.VOID_CART.add = async () => { throw Error('Write failed'); };
  await handlers.submit({ preventDefault() {} });
  assert(selectors['[data-feedback]'].textContent.includes('Could not save'), 'Product reports write failure');
}
(async () => {
  await productFeedback();
  console.log('PASS product form: acknowledged writes and error feedback.');
  for (const base of ['file:///void/', 'http://localhost/', 'https://void.example/']) {
    await scenario(base);
    console.log(`PASS ${base}: isolated/shared storage, product transitions, history, reload, counts, rows, totals, removals, request ordering, errors.`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
