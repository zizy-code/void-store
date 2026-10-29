(() => {
  const list = document.querySelector('[data-cart-items]');
  const total = document.querySelector('[data-cart-total]');
  const feedback = document.querySelector('[data-cart-feedback]');
  function render() {
    const cart = window.VOID_CART;
    if (cart.loading || cart.error) {
      list.textContent = cart.error
        ? 'Could not load your cart. Please allow browser storage and reload the page.'
        : 'Loading your cart…';
      total.textContent = '';
      return;
    }
    const items = cart.items();
    list.replaceChildren();
    let sum = 0;
    if (!items.length) {
      const empty = document.createElement('p');
      empty.textContent = 'Your cart is empty. Explore the catalog to find your next piece.';
      list.append(empty);
    }
    items.forEach(item => {
      const product = window.VOID_PRODUCTS.find(product => product.id === item.productId);
      sum += product.price * item.quantity;
      const row = document.createElement('article');
      row.className = 'cart-row';
      const image = document.createElement('img');
      image.src = product.image;
      image.alt = `${product.name}, ${product.color}`;
      const details = document.createElement('div');
      const title = document.createElement('h2');
      const link = document.createElement('a');
      link.href = `product.html?id=${encodeURIComponent(product.id)}`;
      link.textContent = product.name;
      title.append(link);
      const variant = document.createElement('p');
      variant.textContent = `${product.color} · Size ${item.size} · Quantity ${item.quantity}`;
      const price = document.createElement('p');
      price.textContent = window.VOID_MONEY(product.price * item.quantity);
      details.append(title, variant, price);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.setAttribute('aria-label', `Remove ${product.name}, size ${item.size}`);
      remove.addEventListener('click', async () => {
        try {
          remove.disabled = true;
          await window.VOID_CART.remove(product.id, item.size);
          render();
          feedback.textContent = `${product.name} · ${item.size} removed.`;
          const nextButton = list.querySelector('button');
          if (nextButton) nextButton.focus();
          else document.querySelector('.back-link').focus();
        } catch {
          remove.disabled = false;
          feedback.textContent = 'Could not update your cart. Please allow browser storage and try again.';
        }
      });
      row.append(image, details, remove);
      list.append(row);
    });
    total.textContent = items.length ? `Total · ${window.VOID_MONEY(sum)}` : '';
  }
  render();
  window.addEventListener('void-cart-change', render);
})();
