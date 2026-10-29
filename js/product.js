(() => {
  const id = new URLSearchParams(window.location.search).get('id');
  const product = window.VOID_PRODUCTS.find(item => item.id === id);
  const content = document.querySelector('[data-product]');
  const status = document.querySelector('[data-product-status]');
  if (!product) {
    document.title = 'Product not found — VOID';
    status.textContent = 'Product not found. Explore the catalog to find your next piece.';
    return;
  }
  document.title = `${product.name} — VOID`;
  status.hidden = true;
  content.hidden = false;
  const image = content.querySelector('img');
  image.src = product.image;
  image.alt = `${product.name}, ${product.color}`;
  content.querySelector('h1').textContent = product.name;
  content.querySelector('[data-color]').textContent = product.color;
  content.querySelector('[data-price]').textContent = window.VOID_MONEY(product.price);
  content.querySelector('[data-description]').textContent = product.description;
  const sizes = content.querySelector('[data-sizes]');
  product.sizes.forEach(size => {
    const label = document.createElement('label');
    label.className = 'size-option';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'size';
    input.value = size;
    input.required = true;
    const text = document.createElement('span');
    text.textContent = size;
    label.append(input, text);
    sizes.append(label);
  });
  const form = content.querySelector('form');
  const feedback = content.querySelector('[data-feedback]');
  form.addEventListener('change', () => { feedback.textContent = ''; });
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  window.VOID_CART.ready.then(() => { button.disabled = false; }).catch(() => {
    feedback.textContent = 'Could not load your cart. Please allow browser storage and reload the page.';
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const size = new FormData(form).get('size');
    try {
      button.disabled = true;
      await window.VOID_CART.add(product.id, size);
      feedback.textContent = `${product.name} · ${size} added to your cart.`;
    } catch {
      feedback.textContent = 'Could not save your cart. Please allow browser storage and try again.';
    } finally {
      button.disabled = false;
    }
  });
})();
