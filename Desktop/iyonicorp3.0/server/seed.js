// Demo store seed data for theme previews
// Run: node seed.js

import db from './db.js';

const DEMO_PRODUCTS = [
  {
    id: 'demo-1',
    name: 'Premium Wireless Headphones',
    description: 'High-quality wireless headphones with active noise cancellation, 30-hour battery life, and premium sound. Perfect for music lovers and professionals.',
    price: 299.99,
    category: 'Electronics',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1484704849700-fbfaa175d702?auto=format&fit=crop&q=80&w=800'
    ],
    stock: 50,
  },
  {
    id: 'demo-2',
    name: 'Smart Watch Pro',
    description: 'Advanced smartwatch with health tracking, GPS, heart rate monitoring, and 7-day battery life. Your personal health companion.',
    price: 449.99,
    category: 'Electronics',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf29?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1579586337278-3befc40a1dac?auto=format&fit=crop&q=80&w=800'
    ],
    stock: 30,
  },
  {
    id: 'demo-3',
    name: 'Minimalist Desk Lamp',
    description: 'Modern LED desk lamp with adjustable brightness and color temperature. Perfect for home offices.',
    price: 89.99,
    category: 'Home',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1534234828563-0253171e29b9?auto=format&fit=crop&q=80&w=800'
    ],
    stock: 100,
  },
  {
    id: 'demo-4',
    name: 'Leather Messenger Bag',
    description: 'Genuine leather messenger bag perfect for work and travel. Features multiple compartments and durable construction.',
    price: 199.99,
    category: 'Fashion',
    images: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1590874103328-eac38a5c2f1d?auto=format&fit=crop&q=80&w=800'
    ],
    stock: 25,
  },
  {
    id: 'demo-5',
    name: 'Wireless Charging Pad',
    description: 'Fast wireless charging pad compatible with all Qi-enabled devices. Sleek minimalist design.',
    price: 49.99,
    category: 'Electronics',
    images: [
      'https://images.unsplash.com/photo-1586816879360-004f5b0c51e5?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1622994626696-d1d5658b37e2?auto=format&fit=crop&q=80&w=800'
    ],
    stock: 200,
  },
  {
    id: 'demo-6',
    name: 'Ceramic Artisan Vase',
    description: 'Hand-crafted ceramic vase with unique textured finish. Each piece is one of a kind.',
    price: 129.99,
    category: 'Home',
    images: [
      'https://images.unsplash.com/photo-1612196808214-b8e1d14d0f7b?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1578500493446-bf9ddd04d41b?auto=format&fit=crop&q=80&w=800'
    ],
    stock: 15,
  },
];

const DEMO_SELLER = {
  id: 'demo-seller',
  storeName: 'Demo Store',
  subdomain: 'demo',
  shopType: 'product',
  description: 'Welcome to our demo store. Browse our collection and preview different themes.',
  themeId: 'modern-ecommerce',
  theme: {
    primaryColor: '#3b82f6',
    fontFamily: 'Inter'
  }
};

// Seed demo products
const seedDemoProducts = async () => {
  try {
    // Check if demo products already exist
    const existing = await db.query('SELECT id FROM products WHERE id = $1', ['demo-1']);
    
    if (existing.rows.length > 0) {
      console.log('✅ Demo products already seeded');
      return;
    }

    // Insert demo products
    for (const product of DEMO_PRODUCTS) {
      await db.query(
        `INSERT INTO products (id, name, description, price, category, images, stock, seller_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [product.id, product.name, product.description, product.price, product.category, product.images, product.stock, DEMO_SELLER.id]
      );
    }

    console.log('✅ Demo products seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding demo products:', error.message);
  }
};

// Get demo products (for API)
export const getDemoProducts = () => DEMO_PRODUCTS.map(p => ({
  ...p,
  sellerId: DEMO_SELLER.id
}));

export default { seedDemoProducts, getDemoProducts, DEMO_PRODUCTS, DEMO_SELLER };