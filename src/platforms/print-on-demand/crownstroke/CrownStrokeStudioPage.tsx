import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, Crown, Loader2, Minus, PackageCheck,
  Palette, Plus, Save, ShoppingBag, Trash2, Truck,
} from 'lucide-react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { Order, ordersAPI, Product, productsAPI, Seller, sellersAPI } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import DesignCanvas from './DesignCanvas';
import type { CrownStrokeBooking, CrownStrokeLibraryItem, DesignElement, ExportFormat } from './crownStrokeTypes';
import { CROWN_STROKE_DEMO_PRODUCTS, defaultCrownStrokeBooking, DEFAULT_SIZES } from './crownStrokeTypes';
import './crown-stroke.css';

const CANVAS_SIZE = 1200;
const CART_STORAGE_PREFIX = 'crownstroke-cart-v1';
const PRODUCT_VARIANT_COLORS = ['#f6f3ed', '#1c2b25', '#1e3a8a', '#a45f3f', '#77927b', '#b0754e', '#a8a29e', '#d99a9a'];
const STARTER_LIBRARY: CrownStrokeLibraryItem[] = [
  { id: 'phrase-own-it', label: 'Make it yours', category: 'text', type: 'text', text: 'Make it yours', fill: '#26382f' },
  { id: 'phrase-custom', label: 'Custom text', category: 'text', type: 'text', text: 'Your words here', fill: '#26382f' },
  { id: 'shape-circle', label: 'Circle', category: 'shapes', type: 'shape', shape: 'circle', fill: '#b56d4d', stroke: '#8c5039' },
  { id: 'shape-rectangle', label: 'Label', category: 'shapes', type: 'shape', shape: 'rectangle', fill: '#e7cbb7', stroke: '#9f6548' },
  { id: 'artwork-star', label: 'Star sticker', category: 'artwork', type: 'shape', shape: 'sticker-star', fill: '#d9a753', stroke: '#987044' },
  { id: 'artwork-heart', label: 'Heart sticker', category: 'artwork', type: 'shape', shape: 'sticker-heart', fill: '#b56d4d', stroke: '#8c5039' },
];

interface ProductVariant {
  size?: unknown;
  color?: unknown;
  price?: unknown;
  image?: unknown;
  imageUrl?: unknown;
  images?: unknown;
}

type ProductWithOptions = Product & {
  sizes?: unknown;
  availableSizes?: unknown;
  colors?: unknown;
  availableColors?: unknown;
  variants?: unknown;
  options?: unknown;
};

const selectedVariant = (product: Product, size: string, color: string): ProductVariant | undefined => {
  const variants = getProductVariants(product);
  return variants.find((item) => item.size === size && item.color === color)
    || variants.find((item) => item.color === color)
    || variants.find((item) => item.size === size);
};

const selectedUnitPrice = (product: Product, size: string, color: string): number => {
  const price = selectedVariant(product, size, color)?.price;
  return typeof price === 'number' && Number.isFinite(price) && price >= 0 ? price : product.price;
};

const cartLineUnitPrice = (line: CrownStrokeCartLine): number =>
  Number.isFinite(line.unitPrice) && (line.unitPrice as number) >= 0 ? line.unitPrice as number : line.product.price;

interface StudioDesignState {
  elements?: DesignElement[];
  background?: string;
  size?: string;
  color?: string;
  quantity?: number;
}

interface StudioRouteState {
  product?: Product;
  seller?: Seller;
  design?: StudioDesignState;
}

interface CrownStrokeCartLine {
  id: string;
  sellerId: string;
  product: Product;
  productImage: string;
  productSize: string;
  productColor: string;
  quantity: number;
  unitPrice?: number;
  designData: string;
  designPreview: string;
  background: string;
  currency: string;
  addedAt: string;
}

type StudioStage = 'customize' | 'cart' | 'checkout';

const optionStrings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((option) => {
    if (typeof option === 'string' && option.trim()) return [option.trim()];
    if (!option || typeof option !== 'object') return [];
    const candidate = option as { value?: unknown; name?: unknown; label?: unknown };
    const text = [candidate.value, candidate.name, candidate.label].find((entry) => typeof entry === 'string' && entry.trim());
    return typeof text === 'string' ? [text.trim()] : [];
  });
};

const getProductVariants = (product: Product): ProductVariant[] => {
  const variants = (product as ProductWithOptions).variants;
  return Array.isArray(variants) ? variants.filter((variant): variant is ProductVariant => Boolean(variant && typeof variant === 'object')) : [];
};

const productTypeFor = (product: Product): CrownStrokeBooking['productType'] => {
  const name = product.name.toLowerCase();
  const category = product.category?.toLowerCase() || '';
  if (name.includes('hoodie')) return 'hoodie';
  if (name.includes('mug') || category.includes('drinkware')) return 'mug';
  if (name.includes('poster') || category.includes('wall')) return 'poster';
  if (name.includes('tote')) return 'tote';
  if (name.includes('sticker')) return 'sticker';
  return 'tshirt';
};

const getProductSizeOptions = (product: Product): string[] => {
  const extended = product as ProductWithOptions;
  const options = extended.options && typeof extended.options === 'object' ? extended.options as Record<string, unknown> : {};
  const explicit = optionStrings(extended.sizes).concat(optionStrings(extended.availableSizes), optionStrings(options.size), optionStrings(options.sizes));
  const variantSizes = getProductVariants(product).flatMap((variant) => typeof variant.size === 'string' ? [variant.size] : []);
  const sizes = [...new Set(explicit.concat(variantSizes))];
  return sizes.length ? sizes : DEFAULT_SIZES[productTypeFor(product)] || ['M'];
};

const getProductColorOptions = (product: Product): string[] => {
  const extended = product as ProductWithOptions;
  const options = extended.options && typeof extended.options === 'object' ? extended.options as Record<string, unknown> : {};
  const explicit = optionStrings(extended.colors).concat(optionStrings(extended.availableColors), optionStrings(options.color), optionStrings(options.colors));
  const variantColors = getProductVariants(product).flatMap((variant) => typeof variant.color === 'string' ? [variant.color] : []);
  const unique = [...new Set(explicit.concat(variantColors))];
  return unique.length ? unique : PRODUCT_VARIANT_COLORS;
};

const selectedVariantImage = (product: Product, size: string, color: string): string | undefined => {
  const variants = getProductVariants(product);
  const variant = variants.find((item) => item.size === size && item.color === color)
    || variants.find((item) => item.color === color)
    || variants.find((item) => item.size === size);
  if (!variant) return undefined;
  if (typeof variant.image === 'string') return variant.image;
  if (typeof variant.imageUrl === 'string') return variant.imageUrl;
  if (Array.isArray(variant.images) && typeof variant.images[0] === 'string') return variant.images[0];
  return undefined;
};

const parseDesignElements = (raw: unknown): DesignElement[] | null => {
  try {
    const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return null;
    return parsed.every((element) => {
      if (!element || typeof element !== 'object') return false;
      const item = element as Partial<DesignElement>;
      if (
        typeof item.id !== 'string'
        || !['text', 'image', 'shape'].includes(item.type || '')
        || !Number.isFinite(item.x)
        || !Number.isFinite(item.y)
        || !Number.isFinite(item.rotation)
        || !Number.isFinite(item.scaleX)
        || !Number.isFinite(item.scaleY)
        || typeof item.data !== 'object'
        || item.data === null
      ) return false;
      const data = item.data as Record<string, unknown>;
      if (item.type === 'text') return typeof data.text === 'string' && typeof data.fontFamily === 'string' && typeof data.fill === 'string';
      if (item.type === 'image') return typeof data.src === 'string' && Number.isFinite(data.width) && Number.isFinite(data.height);
      return typeof data.shape === 'string' && typeof data.fill === 'string' && Number.isFinite(data.width) && Number.isFinite(data.height);
    }) ? parsed as DesignElement[] : null;
  } catch {
    return null;
  }
};

const isCartLine = (line: unknown): line is CrownStrokeCartLine => {
  if (!line || typeof line !== 'object') return false;
  const item = line as Partial<CrownStrokeCartLine>;
  return Boolean(
    typeof item.id === 'string'
    && item.id
    && typeof item.sellerId === 'string'
    && item.product
    && typeof item.product.id === 'string'
    && typeof item.product.name === 'string'
    && Number.isFinite(item.product.price)
    && (item.product.price as number) >= 0
    && Array.isArray(item.product.images)
    && item.product.images.every((image) => typeof image === 'string')
    && typeof item.productSize === 'string'
    && typeof item.productColor === 'string'
    && Number.isInteger(item.quantity)
    && (item.quantity as number) >= 1
    && (item.quantity as number) <= 10
    && (item.unitPrice === undefined || (Number.isFinite(item.unitPrice) && (item.unitPrice as number) >= 0))
    && typeof item.designData === 'string'
    && parseDesignElements(item.designData) !== null
    && (typeof item.designPreview === 'string' || item.designPreview === undefined)
    && (typeof item.productImage === 'string' || item.productImage === undefined)
    && (typeof item.background === 'string' || item.background === undefined)
    && (typeof item.currency === 'string' || item.currency === undefined)
  );
};

const readCart = (key: string): CrownStrokeCartLine[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(key);
      return [];
    }
    const validLines = parsed.filter(isCartLine);
    if (validLines.length !== parsed.length) localStorage.setItem(key, JSON.stringify(validLines));
    return validLines;
  } catch {
    try { localStorage.removeItem(key); } catch { /* Storage may be disabled by the browser. */ }
    return [];
  }
};

const readDesignDraft = (productId: string): StudioDesignState | null => {
  const key = `crownstroke-design-${productId}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudioDesignState;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.elements)) throw new Error('Invalid draft');
    const elements = parseDesignElements(parsed.elements);
    if (!elements) throw new Error('Invalid draft elements');
    return {
      elements,
      background: typeof parsed.background === 'string' ? parsed.background : '#fffefa',
      size: typeof parsed.size === 'string' ? parsed.size : undefined,
      color: typeof parsed.color === 'string' ? parsed.color : undefined,
      quantity: Number.isFinite(parsed.quantity) ? Math.max(1, Math.min(10, Math.floor(parsed.quantity as number))) : 1,
    };
  } catch {
    try { localStorage.removeItem(key); } catch { /* Storage may be disabled by the browser. */ }
    return null;
  }
};

const designFromCartLine = (line: CrownStrokeCartLine): StudioDesignState | null => {
  const elements = parseDesignElements(line.designData);
  if (!elements) return null;
  return {
    elements,
    background: line.background || '#fffefa',
    size: line.productSize,
    color: line.productColor,
    quantity: line.quantity,
  };
};

const findStoredCart = (productId: string, lineId = ''): { key: string; lines: CrownStrokeCartLine[] } | null => {
  try {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(`${CART_STORAGE_PREFIX}:`));
    for (const key of keys) {
      const lines = readCart(key);
      const match = lines.some((line) => line.product.id === productId && (!lineId || line.id === lineId));
      if (match) return { key, lines };
    }
  } catch {
    return null;
  }
  return null;
};

const isProductSnapshot = (product: unknown, productId: string): product is Product => {
  if (!product || typeof product !== 'object') return false;
  const candidate = product as Partial<Product>;
  return candidate.id === productId
    && typeof candidate.sellerId === 'string'
    && typeof candidate.name === 'string'
    && Number.isFinite(candidate.price)
    && Array.isArray(candidate.images)
    && candidate.images.every((image) => typeof image === 'string');
};

const readProductSnapshot = (productId: string): Product | null => {
  const key = `crownstroke-product-${productId}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const product: unknown = JSON.parse(raw);
    if (isProductSnapshot(product, productId)) return product;
    localStorage.removeItem(key);
  } catch {
    try { localStorage.removeItem(key); } catch { /* Storage may be disabled by the browser. */ }
  }
  return null;
};

const captureDesignPreview = (): string => {
  try {
    const source = document.querySelector<HTMLCanvasElement>('.cs-editor-canvas');
    if (!source) return '';
    const preview = document.createElement('canvas');
    preview.width = 320;
    preview.height = 320;
    const context = preview.getContext('2d');
    if (!context) return '';
    context.drawImage(source, 0, 0, preview.width, preview.height);
    return preview.toDataURL('image/jpeg', 0.72);
  } catch {
    return '';
  }
};

const CrownStrokeStudioPage: React.FC = () => {
  const { productId = '' } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const routeState = location.state as StudioRouteState | null;
  const initialProduct = routeState?.product?.id === productId ? routeState.product : null;
  const routeDesign = routeState?.design;
  const initialElements = parseDesignElements(routeDesign?.elements) || [];
  const [product, setProduct] = useState<Product | null>(initialProduct);
  const [seller, setSeller] = useState<Seller | null>(routeState?.seller || null);
  const [elements, setElements] = useState<DesignElement[]>(initialElements);
  const [background, setBackground] = useState(typeof routeDesign?.background === 'string' ? routeDesign.background : '#fffefa');
  const [selectedSize, setSelectedSize] = useState(typeof routeDesign?.size === 'string' ? routeDesign.size : '');
  const [selectedColor, setSelectedColor] = useState(typeof routeDesign?.color === 'string' ? routeDesign.color : '#1c2b25');
  const [quantity, setQuantity] = useState(Number.isFinite(routeDesign?.quantity) ? Math.max(1, Math.min(10, Math.floor(routeDesign?.quantity as number))) : 1);
  const [uploadedArtworks, setUploadedArtworks] = useState<CrownStrokeLibraryItem[]>([]);
  const [productImageIndex, setProductImageIndex] = useState(0);
  const [failedVariantImage, setFailedVariantImage] = useState('');
  const [historyResetKey, setHistoryResetKey] = useState(0);
  const [loading, setLoading] = useState(!initialProduct);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [savedAt, setSavedAt] = useState('');
  const [cart, setCart] = useState<CrownStrokeCartLine[]>([]);
  const [cartStorageKey, setCartStorageKey] = useState('');
  const [cartReadyForKey, setCartReadyForKey] = useState('');
  const [cartError, setCartError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState<Order | null>(null);
  const [paymentLink, setPaymentLink] = useState('');
  const [paymentVerified, setPaymentVerified] = useState(false);

  const stageParam = searchParams.get('stage');
  const stage: StudioStage = stageParam === 'cart' || stageParam === 'checkout' ? stageParam : 'customize';
  const editingCartId = searchParams.get('edit') || '';
  const checkoutLineId = searchParams.get('line') || '';
  const currency = seller?.currency || 'USD';

  const restoreDesign = (design: StudioDesignState | null) => {
    if (!design) return;
    setElements(Array.isArray(design.elements) ? design.elements : []);
    setHistoryResetKey((key) => key + 1);
    setBackground(typeof design.background === 'string' ? design.background : '#fffefa');
    if (typeof design.size === 'string') setSelectedSize(design.size);
    if (typeof design.color === 'string') setSelectedColor(design.color);
    if (typeof design.quantity === 'number') setQuantity(Math.max(1, Math.min(10, Math.floor(design.quantity))));
  };

  const restoreProduct = (loadedProduct: Product, explicitDesign = routeDesign) => {
    setProduct(loadedProduct);
    try { localStorage.setItem(`crownstroke-product-${loadedProduct.id}`, JSON.stringify(loadedProduct)); } catch { /* Cart and draft persistence remain available when storage is full. */ }
    const storageKey = `${CART_STORAGE_PREFIX}:${loadedProduct.sellerId || 'shared'}`;
    const storedCart = readCart(storageKey);
    setCart(storedCart);
    setCartStorageKey(storageKey);
    setCartReadyForKey(storageKey);
    const editingLine = editingCartId
      ? storedCart.find((line) => line.id === editingCartId && line.product.id === loadedProduct.id)
      : undefined;
    const restored = explicitDesign
      ? {
          ...explicitDesign,
          elements: parseDesignElements(explicitDesign.elements) || [],
        }
      : editingLine
        ? designFromCartLine(editingLine)
        : readDesignDraft(loadedProduct.id);
    restoreDesign(restored);
  };

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      return;
    }
    if (initialProduct) {
      setSeller(routeState?.seller || null);
      restoreProduct(initialProduct);
      setLoading(false);
      return;
    }
    let active = true;
    void (async () => {
      setLoading(true);
      setError('');
      try {
        const result = await productsAPI.getById(productId);
        if (!active) return;
        restoreProduct(result);
      } catch {
        if (active) {
          const cachedProduct = readProductSnapshot(productId)
            || CROWN_STROKE_DEMO_PRODUCTS.find((candidate) => candidate.id === productId)
            || null;
          if (cachedProduct) {
            setSeller(null);
            restoreProduct(cachedProduct, routeDesign);
            return;
          }
          const recoveredCart = findStoredCart(productId, editingCartId);
          const recoveredLine = recoveredCart?.lines.find((line) => line.product.id === productId && (!editingCartId || line.id === editingCartId));
          if (recoveredCart && recoveredLine) {
            setSeller(null);
            restoreProduct(recoveredLine.product, routeDesign || designFromCartLine(recoveredLine) || undefined);
          } else {
            setError('We could not find that product. Return to the CrownStroke store to choose another.');
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [productId, initialProduct, editingCartId, routeDesign, routeState?.seller]);

  useEffect(() => {
    setProductImageIndex(0);
    setFailedVariantImage('');
  }, [product?.id]);

  const sizes = useMemo(() => product ? getProductSizeOptions(product) : ['M'], [product]);
  const colors = useMemo(() => product ? getProductColorOptions(product) : PRODUCT_VARIANT_COLORS, [product]);
  const variantImage = product ? selectedVariantImage(product, selectedSize, selectedColor) : undefined;
  const editingLine = editingCartId ? cart.find((line) => line.id === editingCartId && line.product.id === product?.id) : undefined;
  const displayedProductImage = variantImage && variantImage !== failedVariantImage
    ? variantImage
    : editingLine?.productSize === selectedSize && editingLine.productColor === selectedColor && editingLine.productImage
      ? editingLine.productImage
      : product?.images?.[productImageIndex];

  useEffect(() => {
    if (sizes.length && !sizes.includes(selectedSize)) setSelectedSize(sizes.includes('M') ? 'M' : sizes[0]);
  }, [sizes, selectedSize]);

  useEffect(() => {
    if (colors.length && !colors.includes(selectedColor)) setSelectedColor(colors[0]);
  }, [colors, selectedColor]);

  useEffect(() => {
    if (!product?.sellerId || seller?.id === product.sellerId) return;
    let active = true;
    void sellersAPI.getPublicById(product.sellerId)
      .then((result) => { if (active) setSeller(result); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [product?.sellerId, seller?.id]);

  useEffect(() => {
    if (!cartStorageKey || cartReadyForKey !== cartStorageKey) return;
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify(cart));
      setCartError('');
    } catch {
      setCartError('Your browser could not save this cart. Remove large uploaded artwork or try another browser.');
    }
  }, [cart, cartStorageKey, cartReadyForKey]);

  useEffect(() => {
    if (!cartStorageKey || cartReadyForKey !== cartStorageKey) return;
    const syncCartFromOtherTab = (event: StorageEvent) => {
      if (event.key !== cartStorageKey) return;
      setCart(readCart(cartStorageKey));
    };
    window.addEventListener('storage', syncCartFromOtherTab);
    return () => window.removeEventListener('storage', syncCartFromOtherTab);
  }, [cartStorageKey, cartReadyForKey]);

  useEffect(() => {
    setSaved(false);
    setSavedAt('');
  }, [elements, background, selectedSize, selectedColor, quantity]);

  const libraryItems = useMemo(() => [...STARTER_LIBRARY, ...uploadedArtworks], [uploadedArtworks]);

  const handleAddImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const image = new Image();
      image.onload = () => setUploadedArtworks((items) => [...items, {
        id: `upload_${Math.random().toString(36).slice(2, 9)}`,
        label: file.name.replace(/\.[^.]+$/, '') || 'Uploaded artwork',
        category: 'artwork',
        type: 'image',
        image: { src, width: image.width, height: image.height, naturalWidth: image.width, naturalHeight: image.height },
      }]);
      image.src = src;
    };
    reader.readAsDataURL(file);
  }, []);

  const setStage = (nextStage: StudioStage, lineId?: string) => {
    const next = new URLSearchParams();
    next.set('stage', nextStage);
    if (lineId) next.set('line', lineId);
    setSearchParams(next);
  };

  const handleExport = (dataUrl: string, format: ExportFormat) => {
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = `crownstroke-${product?.id || 'design'}.${format}`;
    anchor.click();
  };

  const saveDraft = () => {
    if (!product) return;
    try {
      localStorage.setItem(`crownstroke-design-${product.id}`, JSON.stringify({
        elements, background, size: selectedSize, color: selectedColor, quantity,
      }));
      setSavedAt(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
      setSaved(true);
      setOrderError('');
    } catch {
      setOrderError('We could not save this design in this browser. Please export a copy instead.');
    }
  };

  const returnToStore = () => {
    navigate('/pdp/crown-stroke/store', {
      state: { crownStrokeStudioDraft: { product, elements, background, size: selectedSize, color: selectedColor, quantity } },
    });
  };

  const addToCart = () => {
    if (!product || !cartStorageKey || cartReadyForKey !== cartStorageKey) return;
    if (!elements.length) {
      setOrderError('Add at least one element to your design before adding it to the cart.');
      return;
    }
    const line: CrownStrokeCartLine = {
      id: editingCartId || `cs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sellerId: product.sellerId || seller?.id || '',
      product,
      productImage: displayedProductImage || product.images?.[0] || '',
      productSize: selectedSize,
      productColor: selectedColor,
      quantity,
      unitPrice: selectedUnitPrice(product, selectedSize, selectedColor),
      designData: JSON.stringify(elements),
      designPreview: captureDesignPreview(),
      background,
      currency,
      addedAt: new Date().toISOString(),
    };
    const latestCart = readCart(cartStorageKey);
    if (editingCartId && !latestCart.some((item) => item.id === editingCartId && item.product.id === product.id)) {
      setCart(latestCart);
      setCartError('This cart design is no longer available. Return to your cart and reopen the design before updating it.');
      return;
    }
    const nextCart = editingCartId
      ? latestCart.map((item) => item.id === editingCartId ? line : item)
      : [line, ...latestCart];
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify(nextCart));
    } catch {
      setCartError('Your browser could not save this design to the cart. Remove large uploaded artwork or try another browser.');
      return;
    }
    setCart(nextCart);
    setCartError('');
    setOrderError('');
    setStage('cart');
  };

  const editCartLine = (line: CrownStrokeCartLine) => {
    const query = new URLSearchParams({ stage: 'customize', edit: line.id });
    navigate(`/pdp/crown-stroke/studio/${encodeURIComponent(line.product.id)}?${query.toString()}`, {
      state: {
        product: line.product,
        seller: seller?.id === line.sellerId ? seller : null,
        design: {
          elements: (() => {
            try {
              const decoded: unknown = JSON.parse(line.designData);
              return Array.isArray(decoded) ? decoded as DesignElement[] : [];
            } catch {
              return [];
            }
          })(),
          background: line.background,
          size: line.productSize,
          color: line.productColor,
          quantity: line.quantity,
        },
      },
    });
  };

  const removeCartLine = (id: string) => {
    if (!cartStorageKey || cartReadyForKey !== cartStorageKey) return;
    const nextCart = readCart(cartStorageKey).filter((line) => line.id !== id);
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify(nextCart));
      setCart(nextCart);
      setCartError('');
    } catch {
      setCartError('Your browser could not update this cart. Try again after freeing some device storage.');
    }
  };

  const beginCheckout = (lineId: string) => {
    setOrderError('');
    setStage('checkout', lineId);
  };

  const checkoutLine = cart.find((line) => line.id === checkoutLineId) || null;
  const cartTotal = cart.reduce((total, line) => total + cartLineUnitPrice(line) * line.quantity, 0);

  const finishOrder = (order: Order, nextPaymentLink = '') => {
    const remainingCart = cartStorageKey
      ? readCart(cartStorageKey).filter((line) => line.id !== checkoutLineId)
      : cart.filter((line) => line.id !== checkoutLineId);
    if (cartStorageKey) {
      try { localStorage.setItem(cartStorageKey, JSON.stringify(remainingCart)); } catch { setCartError('The order was placed, but the saved cart could not be updated on this device.'); }
    }
    setCart(remainingCart);
    if (checkoutLine) localStorage.removeItem(`crownstroke-design-${checkoutLine.product.id}`);
    setOrderConfirmation(order);
    setPaymentLink(nextPaymentLink);
    setPaymentVerified(false);
  };

  const placeOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!checkoutLine) return;
    if (!user || user.role !== 'customer') {
      setOrderError('Sign in with a customer account before placing an order. Your cart will stay saved.');
      return;
    }
    setSubmitting(true);
    setOrderError('');
    const data = new FormData(event.currentTarget);
    const customerName = String(data.get('name') || '').trim();
    const customerEmail = String(data.get('email') || '').trim();
    const customerPhone = String(data.get('phone') || '').trim();
    const street = String(data.get('street') || '').trim();
    const city = String(data.get('city') || '').trim();
    const state = String(data.get('state') || '').trim();
    const country = String(data.get('country') || '').trim();
    const zipCode = String(data.get('zipCode') || '').trim();
    if (!customerName || !/^\S+@\S+\.\S+$/.test(customerEmail) || !customerPhone || !street || !city || !state || !country || !zipCode) {
      setOrderError('Complete your contact and shipping details with a valid email to continue.');
      setSubmitting(false);
      return;
    }
    const orderSeller = seller?.id === checkoutLine.sellerId ? seller : null;
    const booking: CrownStrokeBooking = {
      ...defaultCrownStrokeBooking,
      productId: checkoutLine.product.id,
      productName: checkoutLine.product.name,
      productType: productTypeFor(checkoutLine.product),
      productSize: checkoutLine.productSize,
      productColor: checkoutLine.productColor,
      designData: checkoutLine.designData,
      designPreview: checkoutLine.designPreview,
      shippingAddress: `${street}, ${city}, ${state}, ${zipCode}, ${country}`,
      notes: String(data.get('notes') || '').trim(),
    };
    const paymentMethod = orderSeller?.paymentGateways?.iyonicpay?.enabled
      ? 'iyonicpay'
      : orderSeller?.paymentGateways?.custom?.enabled ? 'custom' : 'paystack';
    try {
      const order = await ordersAPI.create({
        sellerId: checkoutLine.sellerId,
        customerId: user.id,
        customerName,
        customerEmail,
        customerPhone,
        items: [{
          productId: checkoutLine.product.id,
          productName: checkoutLine.product.name,
          quantity: checkoutLine.quantity,
          price: cartLineUnitPrice(checkoutLine),
        }],
        total: cartLineUnitPrice(checkoutLine) * checkoutLine.quantity,
        subtotal: cartLineUnitPrice(checkoutLine) * checkoutLine.quantity,
        currency: checkoutLine.currency || orderSeller?.currency || 'USD',
        status: 'pending',
        shippingAddress: { street, city, state, country, zipCode },
        deliveryLocation: JSON.stringify(booking),
        paymentType: 'site',
        paymentMethod,
      });
      if (order.paymentMethod === 'paystack' && order.reference) {
        const response = order as Order & { publicKey?: string; isCustomPaystack?: boolean };
        const paystack = (window as any).PaystackPop;
        if (!response.isCustomPaystack && typeof paystack?.setup === 'function') {
          finishOrder(order);
          const handler = paystack.setup({
            key: response.publicKey || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
            email: customerEmail,
            amount: Math.round(order.total * 100),
            currency: checkoutLine.currency || orderSeller?.currency || 'USD',
            reference: order.reference,
            metadata: { order_id: order.id, type: 'order_payment' },
            onClose: () => setPaymentLink(order.paymentLink || ''),
            callback: (paystackResponse: { reference: string }) => {
              ordersAPI.verifyPayment(paystackResponse.reference, order.id)
                .then((result) => {
                  if (result.success) {
                    setPaymentVerified(true);
                    setPaymentLink('');
                  } else {
                    setPaymentLink(order.paymentLink || '');
                  }
                })
                .catch(() => setPaymentLink(order.paymentLink || ''));
            },
          });
          handler.openIframe();
        } else {
          finishOrder(order, order.paymentLink || '');
        }
      } else if (order.paymentLink && order.paymentMethod === 'iyonicpay') {
        const autoPayLink = order.paymentLink.includes('?') ? `${order.paymentLink}&autoPay=true` : `${order.paymentLink}?autoPay=true`;
        finishOrder(order, autoPayLink);
      } else {
        finishOrder(order, order.paymentLink || '');
      }
    } catch {
      setOrderError('We could not place your order. Your cart is still saved—check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <main className="cs-studio-page"><div className="cs-client-loading"><Loader2 className="pulse-loading" /> Loading your product…</div></main>;
  if (!product) return (
    <main className="cs-studio-page">
      <header className="cs-studio-header"><Crown size={19} /><span>CrownStroke <em>Studio</em></span></header>
      <section className="cs-studio-unavailable" role="alert">
        <h1>Product unavailable</h1><p>{error || 'Return to the store and select an available product.'}</p>
        <button className="cs-button" onClick={() => navigate('/pdp/crown-stroke/store')}>Back to store</button>
      </section>
    </main>
  );

  return (
    <main className="cs-studio-page">
      <header className="cs-studio-header">
        <button className="cs-studio-back" onClick={returnToStore}><ArrowLeft size={16} /> <span>Back to store</span></button>
        <div className="cs-studio-brand"><Crown size={18} /><span>CrownStroke <em>Studio</em></span></div>
        <button type="button" className="cs-studio-cart-link" onClick={() => setStage('cart')} aria-label={`Open cart with ${cart.length} items`}>
          <ShoppingBag size={17} /><span>Cart</span><b>{cart.length}</b>
        </button>
      </header>

      {orderConfirmation ? (
        <section className="cs-studio-confirmation" role="status">
          <span className="cs-studio-confirm-icon"><Check size={25} /></span>
          <p className="cs-kicker">{paymentVerified ? 'ORDER RECEIVED · PAYMENT CONFIRMED' : 'ORDER RECEIVED · PAYMENT PENDING'}</p>
          <h1>Thank you, {orderConfirmation.customerName}.</h1>
          <p>Your design is attached to order <strong>#{orderConfirmation.id.slice(-8)}</strong>. {paymentVerified ? 'Your payment has been confirmed.' : 'The order is pending while payment is completed or confirmed by the store.'}</p>
          {paymentLink && <a className="cs-button cs-studio-payment-link" href={paymentLink} target="_blank" rel="noreferrer">Continue to secure payment <ArrowRight size={16} /></a>}
          <div className="cs-studio-confirm-actions">
            <button className="cs-button cs-button-ghost" onClick={() => navigate('/pdp/crown-stroke/client')}>View my orders</button>
            <button className="cs-button cs-button-ghost" onClick={() => navigate('/pdp/crown-stroke/store')}>Return to the store</button>
          </div>
        </section>
      ) : (
        <>
          <nav className="cs-studio-progress" aria-label="Order progress">
            {(['customize', 'cart', 'checkout'] as StudioStage[]).map((step, index) => (
              <button key={step} type="button" className={stage === step ? 'active' : stage === 'checkout' || (stage === 'cart' && index === 0) ? 'complete' : ''} onClick={() => {
                if (step === 'customize') setStage('customize');
                if (step === 'cart') setStage('cart');
                if (step === 'checkout') {
                  const nextCheckoutLine = checkoutLine || cart[0];
                  if (nextCheckoutLine) setStage('checkout', nextCheckoutLine.id);
                }
              }}>
                <span>{stage === step ? `0${index + 1}` : (stage === 'checkout' || (stage === 'cart' && index === 0)) ? <Check size={14} /> : `0${index + 1}`}</span>
                {step === 'customize' ? 'Customize' : step === 'cart' ? 'Cart' : 'Checkout'}
              </button>
            ))}
          </nav>

          {stage === 'customize' && (
            <>
              <section className="cs-studio-intro">
                <div><p className="cs-kicker">THE CROWNSTROKE PRINT STUDIO</p><h1>Make it <em>yours.</em></h1></div>
                <p>Shape your artwork, choose a finish, then add your one-of-a-kind piece to the cart.</p>
              </section>
              {error && <p className="cs-studio-error" role="alert">{error}</p>}
              <div className="cs-studio-workspace">
                <section className="cs-studio-editor-section" aria-label="Design editor">
                  <div className="cs-studio-section-heading"><div><span>01</span><h2>Your design</h2></div><span>{elements.length} element{elements.length === 1 ? '' : 's'}</span></div>
                  <div className="cs-studio-canvas">
                    <DesignCanvas
                      width={CANVAS_SIZE}
                      height={CANVAS_SIZE}
                      elements={elements}
                      background={background}
                      onChange={setElements}
                      onBackgroundChange={setBackground}
                      onExport={handleExport}
                      onAddImage={handleAddImage}
                      libraryItems={libraryItems}
                      historyResetKey={historyResetKey}
                    />
                  </div>
                  <div className="cs-studio-canvas-note"><Palette size={14} /><span>Select an element to refine it. Add type, shapes, and images from the studio tools.</span></div>
                </section>

                <aside className="cs-studio-order-panel">
                  <p className="cs-kicker cs-studio-order-step">02 / PRODUCT DETAILS</p>
                  <div className="cs-studio-product-summary">
                    <div className="cs-studio-product-image">
                      {displayedProductImage
                        ? <img src={displayedProductImage} alt={`${product.name}${selectedColor ? ` in ${selectedColor}` : ''}`} onError={() => {
                            if (variantImage && displayedProductImage === variantImage) setFailedVariantImage(variantImage);
                            else setProductImageIndex((index) => index + 1);
                          }} />
                        : <Crown size={28} aria-label="Product image unavailable" />}
                      <span>PRODUCT PREVIEW</span>
                    </div>
                    <div>
                      <p className="cs-kicker">{product.category || 'CUSTOM PRINT'}</p>
                      <h2>{product.name}</h2>
                      <strong>{formatPrice(product.price, currency)}</strong>
                      <p className="cs-studio-product-note">Product preview only · artwork is placed on the separate canvas</p>
                    </div>
                  </div>

                  <div className="cs-studio-options">
                    <fieldset><legend>Size</legend><div className="cs-studio-size-options">{sizes.map((size) => <button type="button" key={size} className={selectedSize === size ? 'selected' : ''} onClick={() => setSelectedSize(size)} aria-pressed={selectedSize === size}>{size}</button>)}</div></fieldset>
                    <fieldset><legend>Color <span>{selectedColor}</span></legend><div className="cs-studio-color-options">{colors.map((color) => <button key={color} type="button" className={selectedColor === color ? 'selected' : ''} style={{ backgroundColor: color }} onClick={() => setSelectedColor(color)} aria-label={`Select ${color}`} aria-pressed={selectedColor === color} />)}</div></fieldset>
                    <div className="cs-studio-quantity"><label htmlFor="studio-quantity">Quantity</label><div className="qty-selector"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} aria-label="Decrease quantity"><Minus size={15} /></button><output id="studio-quantity" aria-live="polite">{quantity}</output><button type="button" onClick={() => setQuantity(Math.min(10, quantity + 1))} disabled={quantity >= 10} aria-label="Increase quantity"><Plus size={15} /></button></div></div>
                  </div>

                  <div className="cs-studio-total"><span>Estimated total</span><strong>{formatPrice(selectedUnitPrice(product, selectedSize, selectedColor) * quantity, currency)}</strong></div>
                  {orderError && <p className="cs-studio-error" role="alert">{orderError}</p>}
                  {cartError && <p className="cs-studio-error" role="alert">{cartError}</p>}
                  <button type="button" className="cs-button cs-studio-add-to-cart" onClick={addToCart} disabled={!cartStorageKey || cartReadyForKey !== cartStorageKey || elements.length === 0}>
                    <ShoppingBag size={16} /> {editingCartId ? 'Update cart design' : 'Add design to cart'}
                  </button>
                  {!elements.length && <p className="cs-studio-hint">Add at least one design element to continue.</p>}
                  <div className="cs-studio-save-area">
                    <button type="button" className="cs-button cs-button-ghost cs-studio-save" onClick={saveDraft}><Save size={15} />{saved ? 'Update saved design' : 'Save design for later'}</button>
                    {saved && <p className="cs-studio-saved" role="status"><Check size={15} /><span><strong>Saved on this device</strong><small>Your artwork and product choices are ready to pick up later{savedAt ? ` · ${savedAt}` : ''}.</small></span></p>}
                  </div>
                  <p className="cs-studio-payment-note"><PackageCheck size={15} /> Secure checkout comes after cart review.</p>
                </aside>
              </div>
            </>
          )}

          {stage === 'cart' && (
            <section className="cs-studio-flow">
              <div className="cs-studio-flow-heading">
                <div><p className="cs-kicker">YOUR SELECTION</p><h1>Review your <em>cart.</em></h1><p>One personalized design is placed per order, so each piece keeps its own artwork and delivery details.</p></div>
                <button type="button" className="cs-button cs-button-ghost" onClick={() => setStage('customize')}><ArrowLeft size={16} /> Back to studio</button>
              </div>
              {cartError && <p className="cs-studio-error" role="alert">{cartError}</p>}
              {cart.length === 0 ? (
                <div className="cs-studio-empty-cart"><ShoppingBag size={27} /><h2>Your cart is waiting for a design.</h2><p>Start with a product, add artwork, then come back here to check out.</p><button type="button" className="cs-button" onClick={() => setStage('customize')}>Back to the studio <ArrowRight size={16} /></button></div>
              ) : (
                <div className="cs-studio-cart-layout">
                  <div className="cs-studio-cart-lines">
                    {cart.map((line) => (
                      <article className="cs-studio-cart-line" key={line.id}>
                        <div className="cs-studio-cart-thumb" aria-label="Selected product and design preview">
                          {line.productImage && <img className="product-thumb" src={line.productImage} alt="" />}
                          {line.designPreview && <img className="design-thumb" src={line.designPreview} alt="Print design preview" />}
                        </div>
                        <div className="cs-studio-cart-description">
                          <p className="cs-kicker">{line.product.category || 'CUSTOM PRINT'}</p>
                          <h2>{line.product.name}</h2>
                          <p>Color <b>{line.productColor}</b><span>·</span> Size <b>{line.productSize}</b><span>·</span> Qty <b>{line.quantity}</b></p>
                          <div className="cs-studio-cart-actions">
                            <button type="button" onClick={() => editCartLine(line)}>Edit design</button>
                            <button type="button" onClick={() => removeCartLine(line.id)} aria-label={`Remove ${line.product.name} from cart`}><Trash2 size={14} /> Remove</button>
                          </div>
                        </div>
                        <strong className="cs-studio-cart-price">{formatPrice(cartLineUnitPrice(line) * line.quantity, line.currency || currency)}</strong>
                        <button className="cs-studio-cart-checkout" type="button" onClick={() => beginCheckout(line.id)}>Check out this design <ArrowRight size={15} /></button>
                      </article>
                    ))}
                  </div>
                  <aside className="cs-studio-cart-summary">
                    <p className="cs-kicker">ORDER SUMMARY</p><h2>Your total</h2>
                    <p><span>{cart.length} custom design{cart.length === 1 ? '' : 's'}</span><b>{formatPrice(cartTotal, currency)}</b></p>
                    <p><span>Shipping</span><b>Calculated by the studio</b></p>
                    <small>Choose one design to check out at a time. Shipping costs, if applicable, are confirmed by the seller.</small>
                    <button type="button" className="cs-button" onClick={() => beginCheckout(cart[0].id)}>Continue to checkout <ArrowRight size={16} /></button>
                  </aside>
                </div>
              )}
            </section>
          )}

          {stage === 'checkout' && checkoutLine && (
            <section className="cs-studio-flow">
              <div className="cs-studio-flow-heading">
                <div><p className="cs-kicker">FINAL DETAILS</p><h1>Make it <em>yours.</em></h1><p>Your design is reserved in this cart while you add your contact and delivery details.</p></div>
                <button type="button" className="cs-button cs-button-ghost" onClick={() => setStage('cart')}><ArrowLeft size={16} /> Return to cart</button>
              </div>
              {!user || user.role !== 'customer' ? (
                <div className="cs-studio-sign-in">
                  <Crown size={24} /><h2>Sign in to place your order</h2>
                  <p>Your cart is saved on this device. Orders require a valid customer account so they appear in your portfolio.</p>
                  {user && user.role !== 'customer'
                    ? <button type="button" className="cs-button" onClick={() => { logout(); navigate(`/login?redirect=${encodeURIComponent(`${location.pathname}?stage=checkout&line=${checkoutLine.id}`)}`); }}>Switch to a customer account</button>
                    : <button type="button" className="cs-button" onClick={() => {
                        const redirect = `${location.pathname}?stage=checkout&line=${encodeURIComponent(checkoutLine.id)}`;
                        const authQuery = new URLSearchParams({ redirect, role: 'customer' });
                        if (seller?.id) authQuery.set('shop', seller.id);
                        if (seller?.subdomain) authQuery.set('subdomain', seller.subdomain);
                        navigate(`/login?${authQuery.toString()}`);
                      }}>Sign in / create account <ArrowRight size={16} /></button>}
                </div>
              ) : (
                <div className="cs-studio-checkout-layout">
                  <form className="cs-studio-checkout-form" onSubmit={placeOrder}>
                    <section>
                      <p className="cs-kicker">01 / CONTACT</p><h2>Your details</h2>
                      <label htmlFor="studio-customer-name">Full name</label><input id="studio-customer-name" name="name" autoComplete="name" defaultValue={user.name || ''} required />
                      <div className="cs-studio-form-row">
                        <div><label htmlFor="studio-customer-email">Email address</label><input id="studio-customer-email" type="email" name="email" autoComplete="email" defaultValue={user.email || ''} required /></div>
                        <div><label htmlFor="studio-customer-phone">Phone</label><input id="studio-customer-phone" type="tel" name="phone" autoComplete="tel" defaultValue={user.phoneNumber || ''} required /></div>
                      </div>
                    </section>
                    <section>
                      <p className="cs-kicker">02 / DELIVERY</p><h2>Where should it go?</h2>
                      <label htmlFor="studio-street">Street address</label><input id="studio-street" name="street" autoComplete="street-address" required />
                      <div className="cs-studio-form-row">
                        <div><label htmlFor="studio-city">City / town</label><input id="studio-city" name="city" autoComplete="address-level2" required /></div>
                        <div><label htmlFor="studio-state">State / region</label><input id="studio-state" name="state" autoComplete="address-level1" required /></div>
                      </div>
                      <div className="cs-studio-form-row">
                        <div><label htmlFor="studio-country">Country</label><input id="studio-country" name="country" autoComplete="country-name" required /></div>
                        <div><label htmlFor="studio-postal">Postal code</label><input id="studio-postal" name="zipCode" autoComplete="postal-code" required /></div>
                      </div>
                      <label htmlFor="studio-order-notes">Note for the studio <span>Optional</span></label><textarea id="studio-order-notes" name="notes" rows={3} placeholder="Any details for the maker?" />
                    </section>
                    <section className="cs-studio-payment-method">
                      <p className="cs-kicker">03 / PAYMENT</p><h2>Secure payment</h2>
                      <p>Your order is created as pending. The configured store payment option will be shown after you place the order; payment is not taken on add-to-cart.</p>
                      <div><Check size={17} /><span><strong>Pay online</strong><small>Payment link or checkout is provided by the seller’s configured gateway.</small></span></div>
                    </section>
                    {orderError && <p className="cs-studio-error" role="alert">{orderError}</p>}
                    <button type="submit" className="cs-button cs-studio-place-order" disabled={submitting}>
                      {submitting ? <><Loader2 size={16} className="pulse-loading" /> Preparing secure checkout…</> : <><PackageCheck size={16} /> Place order <ArrowRight size={16} /></>}
                    </button>
                  </form>
                  <aside className="cs-studio-checkout-summary">
                    <p className="cs-kicker">YOUR DESIGN</p>
                    <div className="cs-studio-checkout-product">
                      <div className="cs-studio-checkout-thumb">
                        {checkoutLine.productImage && <img src={checkoutLine.productImage} alt="" />}
                        {checkoutLine.designPreview && <img className="design-thumb" src={checkoutLine.designPreview} alt="Your print design" />}
                      </div>
                      <div><h3>{checkoutLine.product.name}</h3><p>{checkoutLine.productColor} · {checkoutLine.productSize} · Qty {checkoutLine.quantity}</p></div>
                    </div>
                    <p className="cs-studio-checkout-total"><span>Subtotal</span><strong>{formatPrice(cartLineUnitPrice(checkoutLine) * checkoutLine.quantity, checkoutLine.currency || currency)}</strong></p>
                    <p className="cs-studio-shipping-note"><Truck size={16} /> Shipping is confirmed by the seller after your order is received.</p>
                    <button type="button" className="cs-studio-edit-checkout" onClick={() => editCartLine(checkoutLine)}>Edit design</button>
                  </aside>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {stage === 'checkout' && !checkoutLine && (
        <section className="cs-studio-flow">
          <div className="cs-studio-empty-cart" role="alert">
            <ShoppingBag size={27} /><h2>This cart item is no longer available.</h2>
            <p>It may have been removed in another tab. Review the saved cart and choose a design to continue.</p>
            <button type="button" className="cs-button" onClick={() => setStage('cart')}>Return to cart <ArrowRight size={16} /></button>
          </div>
        </section>
      )}
    </main>
  );
};

export default CrownStrokeStudioPage;
