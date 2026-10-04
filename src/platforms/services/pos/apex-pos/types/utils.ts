import type { Order, Product, Seller } from '../../../../../services/api';

export const formatCurrency = (amount: number, currency: string): string => {
  try {
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : undefined, {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || 'USD'} ${amount.toFixed(2)}`;
  }
};

export const formatTime = (dateString: string): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatDateTimeFull = (dateString: string): string => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export const timeAgo = (dateString: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(dateString);
  } catch {
    return '';
  }
};

export const calculateTax = (amount: number, taxRate: number): number => {
  return (amount * taxRate) / 100;
};

export const calculateSubtotal = (items: { price: number; quantity: number }[]): number => {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
};

export const calculateGrandTotal = (
  subtotal: number,
  taxRate: number,
  serviceCharge: number,
  rounding: 'none' | 'up' | 'down' | 'nearest',
  tip: number = 0
): number => {
  const tax = calculateTax(subtotal, taxRate);
  const serviceFee = serviceCharge > 0 ? (subtotal * serviceCharge) / 100 : 0;
  let total = subtotal + tax + serviceFee + tip;
  switch (rounding) {
    case 'up':
      return Math.ceil(total);
    case 'down':
      return Math.floor(total);
    case 'nearest':
      return Math.round(total);
    case 'none':
    default:
      return Math.round(total * 100) / 100;
  }
};

export const getCategoryName = (category: string): string => {
  const labels: Record<string, string> = {
    appetizer: 'Starters',
    main: 'Mains',
    dessert: 'Desserts',
    drink: 'Drinks',
    special: "Chef's Specials",
    sides: 'Sides',
    default: 'Menu',
  };
  return labels[category] || labels.default;
};

export const createDemoApexMenu = (sellerId: string): Product[] => [
  {
    id: 'apex-demo-coffee',
    sellerId,
    name: 'Espresso',
    description: 'Rich Italian espresso shot.',
    price: 3,
    category: 'drink',
    type: 'service',
    status: 'active',
    images: [],
    stock: 0,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'apex-demo-cappuccino',
    sellerId,
    name: 'Cappuccino',
    description: 'Espresso with steamed milk foam.',
    price: 4.5,
    category: 'drink',
    type: 'service',
    status: 'active',
    images: [],
    stock: 0,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'apex-demo-sandwich',
    sellerId,
    name: 'Avocado Toast',
    description: 'Smashed avocado on sourdough with chili flakes.',
    price: 9,
    category: 'main',
    type: 'service',
    status: 'active',
    images: [],
    stock: 0,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'apex-demo-salad',
    sellerId,
    name: 'Caesar Salad',
    description: 'Fresh romaine with parmesan and house dressing.',
    price: 11,
    category: 'main',
    type: 'service',
    status: 'active',
    images: [],
    stock: 0,
    createdAt: '',
    updatedAt: '',
  },
  {
    id: 'apex-demo-cookie',
    sellerId,
    name: 'Chocolate Chip Cookie',
    description: 'Warm-baked with sea salt.',
    price: 4,
    category: 'dessert',
    type: 'service',
    status: 'active',
    images: [],
    stock: 0,
    createdAt: '',
    updatedAt: '',
  },
];

export type { Order, Product, Seller };
