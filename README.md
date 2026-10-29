# VOID

Static portfolio project built with HTML, CSS and JavaScript.
https://zizy-code.github.io/void-store/?utm_source=chatgpt.com

## Local preview

Open `index.html` directly, or start a local server:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. Keep the same hostname and port for all pages.

## Cart storage

The cart is stored under `void-cart` in `localStorage`.

- HTTP/HTTPS pages use the site's shared origin storage.
- For `file://`, every page embeds the exact same `cart-storage.html` URL. That
  document owns cart storage and handles read/add/remove requests via postMessage.
  This avoids separate carts in browsers that isolate storage by file or query.
- Loading and returning through history only read storage. `pageshow` and `focus`
  refresh the counter and cart contents; adding/removing items writes storage.
- Cart operations return promises. The interface confirms success only after
  storage acknowledges a write. Loading and storage errors are shown explicitly.

Browser storage must be allowed. If the browser blocks local-file iframe storage,
use the local HTTP server above. Old entries in individual page storage are not
merged automatically because they may be stale snapshots of the same cart.

## Regression tests

With Node.js installed:

```sh
node tests/cart.test.cjs
```

Tests simulate separate storage buckets for every local file and product URL,
plus shared storage for HTTP/HTTPS. They exercise the real message handlers and
cart scripts through an iframe transport model, history restoration, reload,
request ordering, rendering and storage failures. Real-browser verification is
still needed for each browser's local-file security policy.
