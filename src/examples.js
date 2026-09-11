function svg(body, bg) {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="${bg}"/>${body}</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(s);
}

function avatar(initials, bg) {
  return svg(`<text x="64" y="80" text-anchor="middle" font-family="-apple-system,Helvetica,Arial,sans-serif" font-size="52" font-weight="700" fill="#ffffff">${initials}</text>`, bg);
}

function tile(emoji, bg) {
  return svg(`<text x="64" y="86" text-anchor="middle" font-size="64">${emoji}</text>`, bg);
}

function buildExamples() {
  return {
    users: [
      { name: 'Ada Lovelace', email: 'ada@example.com', role: 'admin', active: true, avatar: avatar('AL', '#2da44e') },
      { name: 'Grace Hopper', email: 'grace@example.com', role: 'engineer', active: true, avatar: avatar('GH', '#0a84ff') },
      { name: 'Linus Torvalds', email: 'linus@example.com', role: 'engineer', active: false, avatar: avatar('LT', '#ff9f0a') },
      { name: 'Margaret Hamilton', email: 'margaret@example.com', role: 'lead', active: true, avatar: avatar('MH', '#bf5af2') },
    ],
    products: [
      { name: 'Wireless Headphones', price: 199, currency: 'USD', inStock: true, tags: ['audio', 'bluetooth'], image: tile('🎧', '#1c1c1e') },
      { name: 'Mechanical Keyboard', price: 149, currency: 'USD', inStock: true, tags: ['desk', 'keyboard'], image: tile('⌨️', '#2c2c2e') },
      { name: 'Coffee Grinder', price: 89, currency: 'USD', inStock: false, tags: ['kitchen'], image: tile('☕️', '#5a3e2b') },
      { name: 'Desk Lamp', price: 59, currency: 'USD', inStock: true, tags: ['desk', 'lighting'], image: tile('💡', '#3a3a3c') },
    ],
    posts: [
      { title: 'Ship the frontend before the backend exists', author: 'ada', tags: ['mocking', 'workflow'], likes: 42, published: true },
      { title: 'Why your data should never leave your browser', author: 'grace', tags: ['privacy'], likes: 128, published: true },
      { title: 'Draft: a tab is a perfectly good server', author: 'linus', tags: ['relay', 'websocket'], likes: 7, published: false },
    ],
    orders: [
      { userId: 1, productId: 1, quantity: 1, status: 'shipped', total: 199 },
      { userId: 2, productId: 2, quantity: 2, status: 'processing', total: 298 },
      { userId: 4, productId: 4, quantity: 1, status: 'delivered', total: 59 },
    ],
  };
}

module.exports = { buildExamples };
