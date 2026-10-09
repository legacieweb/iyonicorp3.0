import type { Order, Product, Seller } from '../../../services/api';

export type DesignElementType = 'text' | 'image' | 'shape';
export type ShapeType = 'rectangle' | 'circle' | 'sticker-star' | 'sticker-heart';
export type ExportFormat = 'png' | 'jpg' | 'svg';

export interface DesignElement {
  id: string;
  type: DesignElementType;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  locked: boolean;
  opacity: number;
  z: number;
  data:
    | { text: string; fontFamily: string; fontSize: number; fontWeight: number; fontStyle: string; fill: string; stroke: string; strokeWidth: number; align: 'left' | 'center' | 'right' }
    | { src: string; width: number; height: number; naturalWidth: number; naturalHeight: number }
    | { shape: ShapeType; fill: string; stroke: string; strokeWidth: number; width: number; height: number };
}

export interface CrownStrokeLibraryItem {
  id: string;
  label: string;
  category: 'text' | 'shapes' | 'artwork';
  type: DesignElementType;
  text?: string;
  shape?: ShapeType;
  image?: ImageElementData;
  fill?: string;
  stroke?: string;
}

export type TextElementData = {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  align: 'left' | 'center' | 'right';
};

export type ImageElementData = {
  src: string;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
};

export type ShapeElementData = {
  shape: ShapeType;
  fill: string;
  stroke: string;
  strokeWidth: number;
  width: number;
  height: number;
};

export interface Design {
  id: string;
  name: string;
  sellerId: string;
  width: number;
  height: number;
  background: string;
  elements: DesignElement[];
  createdAt: string;
  updatedAt: string;
}

export interface CrownStrokeBooking {
  platform: 'crown-stroke';
  productId: string;
  productName: string;
  designData: string;
  designPreview: string;
  productType: 'tshirt' | 'mug' | 'poster' | 'hoodie' | 'tote' | 'sticker';
  productColor: string;
  productSize: string;
  shippingAddress?: string;
  notes: string;
}

export interface CrownStrokeSettings {
  shopName: string;
  tagline: string;
  primaryColor: string;
  accentColor: string;
  location: string;
  phone: string;
  email: string;
  productTypes: string[];
  featuredCategoryId: string;
  featuredText: string;
}

export const DEFAULT_PRODUCT_TYPES: string[] = ['tshirt', 'mug', 'poster', 'hoodie', 'tote', 'sticker'];
export const DEFAULT_COLORS = ['#ffffff', '#000000', '#f5f5f5', '#1a1a1a', '#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#ffd166', '#ef476f'];
export const DEFAULT_SIZES: Record<string, string[]> = { tshirt: ['XS', 'S', 'M', 'L', 'XL', '2XL'], hoodie: ['S', 'M', 'L', 'XL', '2XL'], mug: ['11oz', '15oz'], poster: ['A4', 'A3', 'A2'], tote: ['Standard'], sticker: ['3in', '4in', '5in'] };
const productArt = (shape: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420"><rect width="420" height="420" fill="#eee9df"/><circle cx="335" cy="82" r="66" fill="#e3dbce"/><path d="M28 336h364" stroke="#d7cebf" stroke-width="2"/><g fill="#f8f6f0" stroke="#405349" stroke-width="5" stroke-linejoin="round">${shape}</g><path d="M175 205h70M185 220h50" stroke="#a45f3f" stroke-width="5" stroke-linecap="round" opacity=".85"/></svg>`)}`;

export const PRODUCT_PLACEHOLDERS: Record<string, string> = {
  tshirt: productArt('<path d="m144 102 42-20h48l42 20 40 36-31 39-25-21v151H160V156l-25 21-31-39z"/><path d="M186 82c2 24 16 38 24 38s22-14 24-38" fill="none"/>'),
  mug: productArt('<path d="M130 127h146v147a26 26 0 0 1-26 26h-94a26 26 0 0 1-26-26z"/><path d="M276 157h25a44 44 0 0 1 0 88h-25" fill="none"/><path d="M160 154h86" stroke="#a45f3f"/>'),
  poster: productArt('<path d="M128 76h164v262H128z"/><path d="M150 98h120v218H150z" fill="#e7ded0"/><path d="M171 267c18-60 38-81 59-117 10 21 17 31 30 42" fill="none" stroke="#405349" stroke-width="8"/><circle cx="211" cy="158" r="17" fill="#a45f3f" stroke="none"/>'),
  hoodie: productArt('<path d="m144 116 42-24h48l42 24 39 33-30 40-28-21v141H163V168l-28 21-30-40z"/><path d="M180 113c2-42 18-58 30-58s28 16 30 58l-30 27z" fill="#e5ddcf"/><path d="M186 230h48v42h-48z" fill="#eee9df"/>'),
  tote: productArt('<path d="M131 153h158l-12 171H143z"/><path d="M169 160v-43a41 41 0 0 1 82 0v43" fill="none"/><path d="M175 213h70" stroke="#a45f3f"/>'),
  sticker: productArt('<path d="m160 124 23-39 46 4 24 39-13 43-45 16-41-22z"/><path d="m243 211 16-29 35 4 18 29-10 33-34 12-31-17z"/><path d="m127 251 18-30 35 3 17 30-10 34-34 11-31-17z"/><circle cx="211" cy="279" r="31" fill="#d8c1a8"/>'),
};

export const CROWN_STROKE_DEMO_PRODUCTS: Product[] = [
  { id: 'cs1', sellerId: 'demo-seller', name: 'Classic Cotton Tee', price: 28, description: 'Add a custom front print to an everyday silhouette.', images: [PRODUCT_PLACEHOLDERS.tshirt], category: 'Apparel', type: 'product', stock: 999, status: 'active', createdAt: '', updatedAt: '' },
  { id: 'cs2', sellerId: 'demo-seller', name: 'Ceramic Mug', price: 18, description: 'Make a favorite mug yours with an original design.', images: [PRODUCT_PLACEHOLDERS.mug], category: 'Drinkware', type: 'product', stock: 999, status: 'active', createdAt: '', updatedAt: '' },
  { id: 'cs3', sellerId: 'demo-seller', name: 'Studio Poster', price: 22, description: 'A clean canvas for an original print.', images: [PRODUCT_PLACEHOLDERS.poster], category: 'Wall Art', type: 'product', stock: 999, status: 'active', createdAt: '', updatedAt: '' },
  { id: 'cs4', sellerId: 'demo-seller', name: 'Heavyweight Hoodie', price: 54, description: 'Make a familiar layer your own with custom artwork.', images: [PRODUCT_PLACEHOLDERS.hoodie], category: 'Apparel', type: 'product', stock: 999, status: 'active', createdAt: '', updatedAt: '' },
  { id: 'cs5', sellerId: 'demo-seller', name: 'Canvas Tote Bag', price: 24, description: 'Everyday carry with room for your artwork.', images: [PRODUCT_PLACEHOLDERS.tote], category: 'Accessories', type: 'product', stock: 999, status: 'active', createdAt: '', updatedAt: '' },
  { id: 'cs6', sellerId: 'demo-seller', name: 'Vinyl Sticker Pack', price: 12, description: 'Turn original artwork into a set of custom stickers.', images: [PRODUCT_PLACEHOLDERS.sticker], category: 'Accessories', type: 'product', stock: 999, status: 'active', createdAt: '', updatedAt: '' },
];

export const defaultCrownStrokeSettings: CrownStrokeSettings = {
  shopName: 'CrownStroke',
  tagline: 'Design. Print. Wear.',
  primaryColor: '#0ea5e9',
  accentColor: '#f59e0b',
  location: '123 Design Street, Creative City',
  phone: '+1 (555) 123-4567',
  email: 'studio@crownstroke.com',
  productTypes: [...DEFAULT_PRODUCT_TYPES],
  featuredCategoryId: 'all',
  featuredText: 'Custom printed just for you. Use our design studio to create something unique.',
};

export const getCrownStrokeSettings = (seller?: Seller | null): CrownStrokeSettings => {
  const saved = seller?.theme?.customizations?.crownStroke || {};
  return { ...defaultCrownStrokeSettings, ...saved, productTypes: saved.productTypes || defaultCrownStrokeSettings.productTypes };
};

export const saveCrownStrokeSettings = (seller: Seller, settings: CrownStrokeSettings): Partial<Seller> => ({
  theme: { ...seller.theme, customizations: { ...seller.theme?.customizations, crownStroke: settings } },
});

export const isCrownStroke = (seller?: Seller | null) =>
  seller?.shopType === 'product' && (seller.themeId || seller.theme?.selectedTheme) === 'crown-stroke';

export const defaultCrownStrokeBooking: CrownStrokeBooking = {
  platform: 'crown-stroke',
  productId: '',
  productName: '',
  designData: '[]',
  designPreview: '',
  productType: 'tshirt',
  productColor: '#0ea5e9',
  productSize: 'M',
  shippingAddress: '',
  notes: '',
};

export const isCrownStrokeBooking = (payload: unknown): boolean => {
  try {
    return (payload as any)?.platform === 'crown-stroke';
  } catch {
    return false;
  }
};

export const readCrownStrokeBooking = (order: Order): CrownStrokeBooking | null => {
  try {
    const payload = JSON.parse(order.deliveryLocation || 'null');
    return payload?.platform === 'crown-stroke' ? payload as CrownStrokeBooking : null;
  } catch {
    return null;
  }
};

export const getDesign = (order: Order): { designData: string; designPreview?: string } => {
  const booking = readCrownStrokeBooking(order);
  return {
    designData: booking?.designData || '',
    designPreview: booking?.designPreview,
  };
};

export const serializeDesign = (design: Design): string => {
  try {
    return JSON.stringify(design.elements.map((element) => {
      const data: Record<string, unknown> = element.data as any;
      return {
        id: element.id,
        type: element.type,
        x: element.x,
        y: element.y,
        rotation: element.rotation,
        scaleX: element.scaleX,
        scaleY: element.scaleY,
        locked: element.locked,
        opacity: element.opacity,
        z: element.z,
        data,
      };
    }));
  } catch {
    return '';
  }
};

export const deserializeDesign = (raw: string): DesignElement[] => {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any) => ({
      id: item.id || `el_${Math.random().toString(36).slice(2, 9)}`,
      type: item.type as DesignElementType,
      x: item.x ?? 0,
      y: item.y ?? 0,
      rotation: item.rotation ?? 0,
      scaleX: item.scaleX ?? 1,
      scaleY: item.scaleY ?? 1,
      locked: item.locked ?? false,
      opacity: item.opacity ?? 1,
      z: item.z ?? 0,
      data: item.data as any,
    }));
  } catch {
    return [];
  }
};

export const getElementTypeLabel = (type: DesignElementType): string => {
  switch (type) {
    case 'text': return 'Text';
    case 'image': return 'Image';
    case 'shape': return 'Shape';
    default: return 'Element';
  }
};

export const shapeOptions: { value: ShapeType; label: string; symbol: string }[] = [
  { value: 'rectangle', label: 'Rectangle', symbol: '▭' },
  { value: 'circle', label: 'Circle', symbol: '⬤' },
  { value: 'sticker-star', label: 'Star', symbol: '★' },
  { value: 'sticker-heart', label: 'Heart', symbol: '♥' },
];

export const fontOptions: { value: string; label: string }[] = [
  { value: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', label: 'Inter' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Georgia (Serif)' },
  { value: '"Courier New", Courier, monospace', label: 'Courier (Mono)' },
  { value: '"Comic Sans MS", cursive, sans-serif', label: 'Comic Sans' },
  { value: '"Arial", sans-serif', label: 'Arial' },
];
