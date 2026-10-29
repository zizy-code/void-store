(() => {
  const products = window.VOID_PRODUCTS;
  document.querySelectorAll('[data-product-grid]').forEach(grid => {
    grid.replaceChildren(...products.map((product, index) => {
      const card = document.createElement('article');
      card.className = 'product-card';
      const link = document.createElement('a');
      link.className = 'product-card-link';
      link.href = `product.html?id=${encodeURIComponent(product.id)}`;
      const visual = document.createElement('div');
      visual.className = 'product-image';
      const number = document.createElement('span');
      number.className = 'product-number';
      number.textContent = `${String(index + 1).padStart(2, '0')} / ${String(products.length).padStart(2, '0')}`;
      const image = document.createElement('img');
      image.src = product.image;
      image.alt = `${product.name}, ${product.color}`;
      image.width = 350;
      image.height = 400;
      visual.append(number, image);
      const info = document.createElement('div');
      info.className = 'product-info';
      const title = document.createElement('h3');
      title.textContent = product.name;
      const color = document.createElement('p');
      color.textContent = product.color;
      info.append(title, color);
      link.append(visual, info);
      card.append(link);
      return card;
    }));
  });
})();
