import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useSearchParams, useParams } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Clock, MapPin, Shield, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller, sellersAPI, productsAPI } from '../../../services/api';
import { formatPrice } from '../../../utils/currency';
import { defaultNovaSettings, getNovaSettings, isNovaDrive, readNovaBooking } from './novaDriveTypes';
import './nova-drive.css';

interface LocationState { service?: Product; seller?: Seller; from?: string }

const NovaDriveDetail: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { serviceId } = useParams<{ serviceId?: string }>();
  const state = (location.state as LocationState) || {};
  const sellerId = searchParams.get('seller') || state?.seller?.id;

  const [service, setService] = useState<Product | null>(state?.service || null);
  const [seller, setSeller] = useState<Seller | null>(state?.seller || null);
  const [loading, setLoading] = useState(!service || !seller);
  const [error, setError] = useState('');

  const [pickupDate, setPickupDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [returnLocation, setReturnLocation] = useState('');
  const [driverAge, setDriverAge] = useState('25');
  const [insuranceLevel, setInsuranceLevel] = useState<'basic' | 'premium' | 'full'>('premium');
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<Order | null>(null);

  useEffect(() => {
    let active = true;
    if (service && seller) {
      setLoading(false);
      return;
    }
    if (!serviceId || !sellerId) {
      navigate('/', { replace: true });
      return;
    }
    setLoading(true);
    Promise.all([
      seller ? Promise.resolve(seller) : sellersAPI.getPublicById(sellerId),
      service ? Promise.resolve(service) : productsAPI.getBySellerId(sellerId),
    ])
      .then(([resolvedSeller, products]) => {
        if (!active) return;
        const resolvedSellerChecked = resolvedSeller;
        if (resolvedSellerChecked && !isNovaDrive(resolvedSellerChecked)) {
          setError('This vehicle is not available.');
          setLoading(false);
          return;
        }
        setSeller(resolvedSellerChecked);
        if (!service) {
          const found = (products as Product[]).find((p) => p.id === serviceId && p.type === 'service');
          setService(found || null);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError('This vehicle could not be found.');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [serviceId, sellerId, service, seller, navigate]);

  const planner = seller ? getNovaSettings(seller) : defaultNovaSettings;
  const today = new Date().toISOString().slice(0, 10);

  const rentalDays = pickupDate && returnDate
    ? Math.max(1, Math.ceil((new Date(returnDate).getTime() - new Date(pickupDate).getTime()) / (1000 * 3600 * 24)))
    : 0;

  const selectedAddOnDetails = planner.addOnOptions.filter((addon) => selectedAddOns.includes(addon.id));
  const addOnTotal = selectedAddOnDetails.reduce((sum, addon) => sum + addon.price, 0);
  const baseTotal = service ? service.price * rentalDays : 0;
  const insuranceMultiplier = insuranceLevel === 'premium' ? 1.18 : insuranceLevel === 'full' ? 1.35 : 1;
  const estimatedTotal = useMemo(
    () => Math.round((baseTotal * insuranceMultiplier + addOnTotal) * 100) / 100,
    [baseTotal, insuranceMultiplier, addOnTotal]
  );

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!service || !seller || !pickupDate || !returnDate || !pickupTime || !returnTime || !pickupLocation || !name.trim() || !/^\S+@\S+\.\S+$/.test(email) || !phone.trim()) {
      setError('Select dates and times, then fill in your contact details.');
      return;
    }

    if (new Date(returnDate) <= new Date(pickupDate)) {
      setError('The return date must be after the pickup date.');
      return;
    }

    setBusy(true);
    try {
      const booking = {
        platform: 'nova-drive',
        vehicleId: service.id,
        vehicleName: service.name,
        pickupDate,
        returnDate,
        pickupTime,
        returnTime,
        pickupLocation,
        returnLocation: returnLocation || pickupLocation,
        driverAge: Number(driverAge),
        insuranceLevel,
        addOns: selectedAddOnDetails.map((a) => a.name),
        specialInstructions: instructions.trim(),
        totalDays: rentalDays,
      };

      const order = await ordersAPI.create({
        sellerId: seller.id,
        customerId: user?.id || '',
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        items: [{ productId: service.id, productName: service.name, quantity: 1, price: service.price }],
        total: estimatedTotal,
        subtotal: baseTotal,
        currency: seller.currency || 'USD',
        status: 'pending',
        shippingAddress: { street: '', city: '', state: '', country: '', zipCode: '' },
        deliveryLocation: JSON.stringify(booking),
        paymentType: 'pod',
      });
      setConfirmation(order);
    } catch {
      setError('We could not process your request. Please try again or call us.');
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (state?.from && state.from.startsWith('/')) {
      navigate(state.from, { replace: true });
    } else {
      window.location.href = `/shop/${seller?.subdomain || ''}`;
    }
  };

  const openPortal = () =>
    navigate(
      user
        ? '/transport/nova-drive/client'
        : `/login?shop=${encodeURIComponent(seller?.id || '')}&subdomain=${encodeURIComponent(
            seller?.subdomain || ''
          )}&redirect=${encodeURIComponent('/transport/nova-drive/client')}`
    );

  if (loading) {
    return (
      <div className="nova-site">
        <div className="aurelia-service-page-loading">
          <div className="button-spinner" />
          <p>Loading the vehicle details…</p>
        </div>
      </div>
    );
  }

  if (!service || !seller) {
    return (
      <div className="nova-site">
        <div className="aurelia-service-page-loading" role="alert">
          {error || 'This vehicle could not be found.'}
        </div>
      </div>
    );
  }

  const description = service.description || '';

  return (
    <div className="nova-site">
      <header className="nova-header">
        <button className="nova-wordmark" onClick={handleBack} aria-label="Back to studio">
          <span className="wordmark-mark"><CalendarDays size={18} /></span>
          <span>Nova <em>Drive</em></span>
        </button>
      </header>

      <main className="aurelia-service-page">
        <div className="service-detail-layout">
          <div className="service-detail-media">
            {service.images && service.images.length > 0 ? (
              <img src={service.images[0]} alt={service.name} className="service-detail-image" />
            ) : (
              <div className="service-detail-placeholder">
                <CalendarDays size={48} />
              </div>
            )}
          </div>

          <div className="service-detail-content">
            <p className="service-coordinate">
              <span /> VEHICLE / {service.category || 'FLEET'}
            </p>
            <p className="nova-kicker">{service.category || 'NOVA FLEET'}</p>
            <h1 className="service-detail-title">{service.name}</h1>
            <p className="service-detail-description">{description || 'A premium vehicle for your journey.'}</p>
            <p className="service-detail-price">
              {formatPrice(service.price, seller.currency || 'USD')} / day
            </p>
            <div className="booking-details" style={{ marginTop: '16px' }}>
              <span><Clock size={16} /> {planner.operatingHours.open}–{planner.operatingHours.close}</span>
              <span><MapPin size={16} /> {seller.contactInfo?.address || 'Location details coming soon'}</span>
            </div>
          </div>
        </div>

        <div className="aurelia-booking aurelia-service-booking">
          <div className="booking-heading">
            <p className="nova-kicker">BOOK YOUR RENTAL</p>
            <h2>
              Let's get you on the<br />
              <i>road.</i>
            </h2>
            <p>Send a request and our team will confirm your reservation within 24 hours.</p>
            <div className="booking-details">
              <span><Shield size={16} /> Fully insured coverage</span>
              <span><Clock size={16} /> {planner.operatingHours.open}–{planner.operatingHours.close}</span>
            </div>
          </div>

          <div className="booking-panel">
            {confirmation ? (
              <div className="booking-success" role="status">
                <span className="success-check">
                  <Check size={20} />
                </span>
                <p className="nova-kicker">REQUEST RECEIVED</p>
                <h3>
                  Your reservation is on its way.<br />
                  <i>in mind.</i>
                </h3>
                <p>
                  Your request for {service.name} from {pickupDate} to {returnDate} is pending review.
                  We will contact you within 24 hours to confirm your rental agreement.
                </p>
                <button className="nova-btn nova-btn-primary" onClick={openPortal}>
                  My bookings <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <form className="aurelia-booking-form" onSubmit={submitRequest}>
                <div className="booking-field-pair">
                  <label>
                    Pick-up date
                    <input
                      type="date"
                      min={today}
                      value={pickupDate}
                      onChange={(event) => {
                        setPickupDate(event.target.value);
                        setReturnDate('');
                      }}
                      required
                    />
                  </label>
                  <label>
                    Return date
                    <input
                      type="date"
                      min={pickupDate || today}
                      value={returnDate}
                      onChange={(event) => setReturnDate(event.target.value)}
                      disabled={!pickupDate}
                      required
                    />
                  </label>
                </div>

                <div className="booking-field-pair">
                  <label>
                    Pick-up time
                    <input
                      type="time"
                      value={pickupTime}
                      onChange={(event) => setPickupTime(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Return time
                    <input
                      type="time"
                      value={returnTime}
                      onChange={(event) => setReturnTime(event.target.value)}
                      required
                    />
                  </label>
                </div>

                <label>
                  Pick-up location
                  <select value={pickupLocation} onChange={(event) => setPickupLocation(event.target.value)} required>
                    <option value="">Select a location</option>
                    {planner.locations.map((location) => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Return location <span className="optional-label">OPTIONAL</span>
                  <input
                    value={returnLocation}
                    onChange={(event) => setReturnLocation(event.target.value)}
                    placeholder="Same as pick-up"
                  />
                </label>

                <label>
                  Driver age
                  <select value={driverAge} onChange={(event) => setDriverAge(event.target.value)}>
                    <option value="25">25+</option>
                    <option value="23">23-24</option>
                    <option value="21">21-22</option>
                  </select>
                </label>

                <label>
                  Insurance
                  <select
                    value={insuranceLevel}
                    onChange={(event) => setInsuranceLevel(event.target.value as 'basic' | 'premium' | 'full')}
                  >
                    {Object.entries(planner.insuranceOptions).map(([key, option]) => (
                      <option key={key} value={key}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>

                {planner.addOnOptions.length > 0 && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px' }}>Extras</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {planner.addOnOptions.map((addon) => (
                        <label
                          key={addon.id}
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px solid var(--nova-gray)', borderRadius: 'var(--nova-radius-sm)' }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedAddOns.includes(addon.id)}
                            onChange={() => toggleAddOn(addon.id)}
                          />
                          <span style={{ flex: 1 }}><strong>{addon.name}</strong></span>
                          <span style={{ color: 'var(--nova-blue)' }}>+{formatPrice(addon.price, seller.currency || 'USD')}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <label>
                  Special instructions <span className="optional-label">OPTIONAL</span>
                  <textarea
                    rows={3}
                    value={instructions}
                    onChange={(event) => setInstructions(event.target.value)}
                    placeholder="Any special requests, preferred vehicle color, or instructions for pick-up?"
                  />
                </label>

                {rentalDays > 0 && (
                  <div style={{ padding: '16px', background: 'var(--nova-gray)', borderRadius: 'var(--nova-radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Rental ({rentalDays} {rentalDays === 1 ? 'day' : 'days'}):</span>
                      <span>{formatPrice(baseTotal, seller.currency || 'USD')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span>Insurance ({insuranceLevel}):</span>
                      <span>+{formatPrice(baseTotal * (insuranceMultiplier - 1), seller.currency || 'USD')}</span>
                    </div>
                    {addOnTotal > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span>Extras:</span>
                        <span>+{formatPrice(addOnTotal, seller.currency || 'USD')}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--nova-silver)', marginTop: '8px', paddingTop: '8px', fontWeight: '700' }}>
                      <span>Estimated total:</span>
                      <span style={{ color: 'var(--nova-blue)' }}>{formatPrice(estimatedTotal, seller.currency || 'USD')}</span>
                    </div>
                  </div>
                )}

                {error && <p className="nova-alert" role="alert" style={{ color: '#fca5a1' }}>{error}</p>}
                <button className="nova-btn nova-btn-primary" style={{ width: '100%' }} type="submit" disabled={busy}>
                  {busy ? 'Sending…' : 'Request booking'}
                  {busy ? <span className="button-spinner" /> : <ArrowRight size={15} />}
                </button>
                <p className="booking-fineprint">No payment now. Your reservation is confirmed once our team responds.</p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default NovaDriveDetail;
