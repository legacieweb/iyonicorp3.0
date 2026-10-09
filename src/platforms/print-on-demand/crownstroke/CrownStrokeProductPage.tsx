import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Crown, Plus, Minus, Edit3 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Product, productsAPI } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import { DEFAULT_SIZES } from './crownStrokeTypes';
import './crown-stroke.css';

const STANDARD_COLORS = ['#f6f3ed', '#1c2b25', '#1e3a8a', '#a45f3f', '#77927b', '#b0754e', '#a8a29e', '#d99a9a'];

const getProductType = (item: Product): string => {
  const category = item.category?.toLowerCase() || '';
  const name = item.name?.toLowerCase() || '';
  if (name.includes('hoodie')) return 'hoodie';
  if (category.includes('apparel') || name.includes('tee')) return 'tshirt';
  if (name.includes('mug') || category.includes('drinkware')) return 'mug';
  if (name.includes('poster') || category.includes('wall')) return 'poster';
  if (name.includes('tote')) return 'tote';
  if (name.includes('sticker')) return 'sticker';
  return 'tshirt';
};

const CrownStrokeProductPage: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('#1e3a8a');
  const [selectedImage, setSelectedImage] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (!serviceId) {
      setError('This product could not be found.');
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const product = await productsAPI.getById(serviceId);
        setProduct(product);
        setSelectedImage(0);
        setImageFailed(false);
      } catch {
        setError('This product could not be found.');
      } finally {
        setLoading(false);
      }
    })();
  }, [serviceId]);

  const availableSizes = useMemo(() => product ? (DEFAULT_SIZES[getProductType(product)] || ['M']) : ['M'], [product]);

  useEffect(() => {
    if (!availableSizes.includes(selectedSize)) setSelectedSize(availableSizes[0]);
  }, [availableSizes, selectedSize]);

  if (loading) return <div className="cs-product-page"><div className="cs-client-loading"><div className="pulse-loading">Loading product…</div></div></div>;
  if (!product) return <div className="cs-product-page"><div className="cs-client-alert" role="alert">{error || 'Product not found.'}</div><button onClick={() => navigate('/pdp/crown-stroke/store')}>← Back to store</button></div>;

  return (
    <div className="cs-product-page">
      <button className="cs-back-link" onClick={() => navigate('/pdp/crown-stroke/store')}><ArrowLeft size={16} /> Back to store</button>

      <div className="cs-product-layout">
        <div className="cs-product-images">
          <div className="product-main-image">{product.images?.[selectedImage] && !imageFailed ? <img src={product.images[selectedImage]} alt={`${product.name} view ${selectedImage + 1}`} onError={() => setImageFailed(true)} /> : <div className="product-image-fallback"><Crown size={42} /><span>{product.name}</span></div>}</div>
          {product.images && product.images.length > 1 && (
            <div className="product-thumbs" aria-label="Product images">{product.images.map((image, index) => (
              <button type="button" key={`${image}-${index}`} className={selectedImage === index ? 'selected' : ''} onClick={() => { setSelectedImage(index); setImageFailed(false); }} aria-label={`Show product image ${index + 1}`} aria-pressed={selectedImage === index}>
                <img src={image} alt="" />
              </button>
            ))}</div>
          )}
        </div>

        <div className="cs-product-details">
          <p className="cs-kicker">PRINT-ON-DEMAND</p>
          <h1>{product.name}</h1>
          <div className="product-rating">Made for your design</div>
          <div className="product-price">{formatPrice(product.price, 'USD')}</div>
          <p className="product-description">{product.description}</p>

          <div className="product-variants">
            <div className="variant-group">
              <label>Size</label>
              <div className="variant-options">
                {availableSizes.map((size) => <button type="button" key={size} className={`variant-option ${selectedSize === size ? 'selected' : ''}`} onClick={() => setSelectedSize(size)}>{size}</button>)}
              </div>
            </div>
            <div className="variant-group">
              <label>Color</label>
              <div className="color-options">
                {STANDARD_COLORS.map((color) => <button key={color} type="button" className={`color-option ${selectedColor === color ? 'selected' : ''}`} onClick={() => setSelectedColor(color)} style={{ backgroundColor: color }} aria-label={`${color} product color`} />)}
              </div>
            </div>
          </div>

          <div className="product-qty">
            <label>Quantity</label>
            <div className="qty-selector">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} aria-label="Decrease quantity"><Minus size={16} /></button>
              <span>{quantity}</span>
              <button type="button" onClick={() => setQuantity(Math.min(10, quantity + 1))} disabled={quantity >= 10} aria-label="Increase quantity"><Plus size={16} /></button>
            </div>
          </div>

          <button className="cs-button cs-button-accent cs-add-to-cart" onClick={() => navigate(`/pdp/crown-stroke/studio/${encodeURIComponent(product.id)}`, { state: { product, design: { elements: [], background: '#fffefa', size: selectedSize, color: selectedColor, quantity } } })}><Edit3 size={16} /> Customize in the studio</button>
        </div>
      </div>

    </div>
  );
};

export default CrownStrokeProductPage;
