window.VOID_PRODUCTS = [
  { id: '1', name: 'Oversized jacket', color: 'Black', image: 'assets/jacket.svg', price: 180, sizes: ['XS', 'S', 'M', 'L', 'XL'], description: 'An oversized silhouette with a clean, structured finish. Designed for layering and everyday movement.' },
  { id: '2', name: 'Longline T-shirt', color: 'Pearl', image: 'assets/tee.svg', price: 55, sizes: ['XS', 'S', 'M', 'L', 'XL'], description: 'An elongated T-shirt with a relaxed fit. A quiet essential for everyday wear.' },
  { id: '3', name: 'Wide-leg trousers', color: 'Black', image: 'assets/pants.svg', price: 120, sizes: ['XS', 'S', 'M', 'L', 'XL'], description: 'Wide-leg trousers with a fluid silhouette and room to move. Pair with oversized layers or a simple tee.' },
  { id: '4', name: 'High-top sneakers', color: 'Black / Milk', image: 'assets/sneakers.svg', price: 160, sizes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'], description: 'High-top sneakers in contrasting black and milk tones. A bold foundation for the everyday wardrobe.' },
  { id: '5', name: 'Draped hoodie', color: 'Dust', image: 'assets/hoodie.svg', price: 110, sizes: ['XS', 'S', 'M', 'L', 'XL'], description: 'A relaxed hoodie with soft draping and generous proportions. Made for effortless layering.' }
];
window.VOID_MONEY = amount => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(amount);
