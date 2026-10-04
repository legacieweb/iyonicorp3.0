import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpenText, Check, FileText, GraduationCap, Sparkles, Upload, Users } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { Order, ordersAPI, Product, Seller, uploadAPI } from '../../../../services/api';
import { formatPrice } from '../../../../utils/currency';
import { createDemoHomeworkerSeller, createDemoHomeworkerServices, getHomeworkerSettings, HomeworkerOrderData } from './homeworkerTypes';
import './homeworker.css';

interface Props { seller: Seller; products: Product[]; demoMode?: boolean }

const HomeworkerSite: React.FC<Props> = ({ seller, products, demoMode = false }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const liveServices = products.filter((product) => product.status === 'active' && product.type === 'service');
  const services = demoMode && liveServices.length === 0
    ? createDemoHomeworkerServices(seller.id)
    : liveServices;
  const settings = getHomeworkerSettings(seller);
  const pricing = demoMode
    ? { ...settings, pricePerPage: settings.pricePerPage || 18, pricePerQuestion: settings.pricePerQuestion || 4 }
    : settings;

  const [selectedService, setSelectedService] = useState<string>(services[0]?.id || '');
  const [pageCount, setPageCount] = useState(1);
  const [questionCount, setQuestionCount] = useState(0);
  const [academicLevel, setAcademicLevel] = useState('high-school');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [instructions, setInstructions] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<Order | null>(null);
  const [demoConfirmation, setDemoConfirmation] = useState(false);

  useEffect(() => {
    const routeState = location.state as { scrollToBooking?: boolean } | null;
    if (!routeState?.scrollToBooking) return;
    document.getElementById('booking')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [location.state]);

  const today = new Date().toISOString().slice(0, 10);

  const chosenService = useMemo(() => services.find((s) => s.id === selectedService), [selectedService, services]);
  const rate = pricing.pricingModel === 'per-page' ? pricing.pricePerPage : pricing.pricePerQuestion;
  const units = pricing.pricingModel === 'per-page' ? pageCount : Math.max(questionCount, 1);
  const totalPrice = useMemo(() => (chosenService ? rate * units : 0), [chosenService, rate, units]);
  const deposit = useMemo(() => Math.round(totalPrice * (settings.depositPercent / 100)), [totalPrice, settings.depositPercent]);
  const remaining = useMemo(() => totalPrice - deposit, [totalPrice, deposit]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(event.target.files || []));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setNotice('');
    if (!chosenService || !seller) {
      setError('Please select a homework type.');
      return;
    }
    if (!date || !time) {
      setError('Please select a deadline date and time.');
      return;
    }
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Please fill in your name, email, and phone number.');
      return;
    }

    if (demoMode) {
      setDemoConfirmation(true);
      setNotice('Preview submitted. No order was created and no files were uploaded.');
      return;
    }

    setBusy(true);
    try {
      let uploadedUrls: string[] = [];
      if (files.length > 0) {
        uploadedUrls = await uploadAPI.upload(files);
      }

      const homeworkData: HomeworkerOrderData = {
        platform: 'homeworker',
        pageCount,
        questionCount: pricing.pricingModel === 'per-question' ? Math.max(questionCount, 1) : questionCount,
        academicLevel,
        subject: chosenService.category || 'General',
        deadline: `${date}T${time}`,
        instructions: instructions.trim(),
        fileUrls: uploadedUrls,
        workerId: null,
        deliverableUrls: [],
        messages: [],
      };

      const order = await ordersAPI.create({
        sellerId: seller.id,
        customerId: user?.id || '',
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim(),
        items: [{ productId: chosenService.id, productName: chosenService.name, quantity: 1, price: totalPrice }],
        total: totalPrice,
        subtotal: totalPrice,
        currency: seller.currency || 'USD',
        status: 'pending',
        shippingAddress: { street: '', city: '', state: '', country: '', zipCode: '' },
        deliveryLocation: JSON.stringify(homeworkData),
        paymentType: 'deposit',
        amountPaid: deposit,
        remainingBalance: remaining,
      });

      setConfirmation(order);
      setNotice(`Your assignment has been submitted! A ${pricing.depositPercent}% deposit allocation is recorded.`);
    } catch {
      setError('We could not process your submission. Please try again or contact the service.');
    } finally {
      setBusy(false);
    }
  };

  const openServiceDetail = (service: Product) => {
    const from = `${location.pathname}${location.search}`;
    const params = new URLSearchParams({ seller: seller.id, from });
    if (demoMode) params.set('demo', 'true');
    navigate(`/homeworker/service/${service.id}?${params.toString()}`, {
      state: { service, seller, demoMode, from },
    });
  };

  if (confirmation || demoConfirmation) {
    return (
      <div className="homeworker-site">
        <header className="homeworker-header">
          <button className="homeworker-wordmark" onClick={() => window.location.href = `/shop/${seller?.subdomain || ''}`} aria-label="Back to Homeworker storefront">
            <span className="wordmark-mark"><BookOpenText size={20} /></span>
            <span>Homeworker</span>
          </button>
        </header>
        <main className="homeworker-confirm-page">
          <div className="homeworker-confirm-card">
            <span className="homeworker-success-check"><Check size={48} /></span>
            <h2>Submission Received</h2>
            <p>{demoConfirmation ? 'This was a design preview. No order or payment was created.' : `Your assignment is recorded. The estimated deposit allocation is ${formatPrice(deposit, seller.currency || 'USD')}. An expert will be assigned shortly.`}</p>
            {demoConfirmation ? (
              <button className="homeworker-button homeworker-button-green" onClick={() => { setDemoConfirmation(false); setNotice(''); }}>
                Return to preview <ArrowRight size={15} />
              </button>
            ) : (
              <button className="homeworker-button homeworker-button-green" onClick={() => navigate('/homeworker/student')}>
                Go to your dashboard <ArrowRight size={15} />
              </button>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="homeworker-site">
      <header className="homeworker-header">
        <a className="homeworker-wordmark" href="#top" aria-label="Homeworker home"><span className="wordmark-mark"><BookOpenText size={20} /></span><span>Homeworker</span></a>
        <nav aria-label="Homeworker navigation">
          <a href="#pricing">Pricing</a>
          <a href="#how-it-works">How it works</a>
          <a href="#booking">Submit homework</a>
          <button className="homeworker-signin" onClick={() => navigate('/login')}>Student sign in</button>
        </nav>
      </header>

      <main id="top">
        <section className="homeworker-hero">
          <div className="homeworker-hero-copy">
            <p className="homeworker-kicker"><span /> Expert homework help, on your terms</p>
            <h1>Make room for<br /><i>your next idea.</i></h1>
            <p className="homeworker-hero-intro">Thoughtful academic support, built around your brief. Work with a subject-matched expert, follow progress, and receive considered work by your deadline.</p>
            <div className="homeworker-hero-actions">
              <a className="homeworker-button homeworker-button-primary" href="#booking">Submit your homework <ArrowRight size={17} /></a>
            </div>
            <div className="homeworker-hero-trust"><Sparkles size={16} /><span>Clear scope · Human expertise · Milestone updates</span></div>
          </div>
          <div className="homeworker-hero-image" aria-label="Assignment brief preview">
            <div className="hero-paper-back" />
            <article className="hero-assignment-sheet">
              <div className="hero-sheet-top"><span>FIELD NOTES / 01</span><span><GraduationCap size={15} /> ACADEMIC SUPPORT</span></div>
              <p className="hero-sheet-label">A considered approach</p>
              <h2>Every assignment<br />starts with a good question.</h2>
              <div className="hero-sheet-rule" />
              <div className="hero-sheet-meta"><span>RESEARCH</span><span>WRITING</span><span>PROBLEM SOLVING</span></div>
              <div className="hero-sheet-footer"><span>Brief received</span><strong><span /> Ready for review</strong></div>
            </article>
            <span className="hero-caption">A clearer way through the work.</span>
          </div>
        </section>

        <section className="homeworker-services">
          <div className="homeworker-section-heading">
            <div>
              <p className="homeworker-kicker">OUR SERVICES</p>
              <h2>Support for the<br /><i>work in front of you.</i></h2>
            </div>
          </div>
          <div className="homeworker-service-grid">
            {services.map((service, index) => (
              <article
                key={service.id}
                className="homeworker-service-card"
              >
                <div className="homeworker-service-number">0{index + 1}</div>
                <div className="homeworker-service-body">
                  {service.images && service.images.length > 0 && (
                    <img src={service.images[0]} alt={service.name} className="homeworker-service-thumb" />
                  )}
                  <p className="service-category">{service.category || 'ANY SUBJECT'}</p>
                  <h3>{service.name}</h3>
                  <p className="service-description">{service.description || 'Expert help for any assignment.'}</p>
                </div>
                <div className="homeworker-service-price">{formatPrice(rate, seller.currency || 'USD')}<small> {pricing.pricingModel === 'per-page' ? 'per page' : 'per question'}</small></div>
                <button
                  aria-label={`View ${service.name} details`}
                  className="homeworker-service-arrow"
                  onClick={() => openServiceDetail(service)}
                  title={`View ${service.name}`}
                >
                  <ArrowRight size={16} />
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="homeworker-calculator" id="pricing">
          <div className="homeworker-section-heading">
            <div>
              <p className="homeworker-kicker">CALCULATE YOUR PRICE</p>
              <h2>See what it costs,<br /><i>before you submit.</i></h2>
            </div>
          </div>
          <form className="homeworker-calc-form" onSubmit={(e) => e.preventDefault()}>
            <label>How is your homework priced?</label>
            <div className="homeworker-calc-row">
              <div className="homeworker-pricing-model" role="group" aria-label={`Pricing model: ${pricing.pricingModel === 'per-page' ? 'per page' : 'per question'}`}>
                <span className={pricing.pricingModel === 'per-page' ? 'active' : ''}>Per page</span>
                <span className={pricing.pricingModel === 'per-question' ? 'active' : ''}>Per question</span>
              </div>
              <div className="homeworker-calc-inputs">
                {pricing.pricingModel === 'per-page' ? (
                  <label>Number of pages
                    <input type="number" min={1} max={100} value={pageCount} onChange={(e) => setPageCount(Number(e.target.value))} required />
                  </label>
                ) : (
                  <label>Number of questions
                    <input type="number" min={1} max={100} value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} required />
                  </label>
                )}
              </div>
            </div>
            <div className="homeworker-calc-result">
              <div><span>Total price</span><strong>{formatPrice(totalPrice, seller.currency || 'USD')}</strong></div>
              <div className="homeworker-deposit-breakdown">
                <span>Deposit allocation ({pricing.depositPercent}%)</span>
                <strong>{formatPrice(deposit, seller.currency || 'USD')}</strong>
              </div>
              <div className="homeworker-balance-breakdown">
                <span>Balance on delivery</span>
                <strong>{formatPrice(remaining, seller.currency || 'USD')}</strong>
              </div>
            </div>
          </form>
        </section>

        <section className="homeworker-process" id="how-it-works">
          <div className="homeworker-section-heading">
            <div>
              <p className="homeworker-kicker">HOW IT WORKS</p>
              <h2>From a clear brief<br /><i>to confident delivery.</i></h2>
            </div>
          </div>
          <div className="homeworker-steps">
            <article><span className="homeworker-step-number">01</span><div className="homeworker-step-icon"><Upload size={19} /></div><h3>Share the brief</h3><p>Choose the support you need, outline your requirements, and set a deadline.</p></article>
            <article><span className="homeworker-step-number">02</span><div className="homeworker-step-icon"><Users size={19} /></div><h3>Work in progress</h3><p>Your matched expert shares updates and can clarify details with you in the workspace.</p></article>
            <article><span className="homeworker-step-number">03</span><div className="homeworker-step-icon"><Sparkles size={19} /></div><h3>Review &amp; receive</h3><p>Review the completed work, settle any remaining balance through the current flow, and download your files.</p></article>
          </div>
        </section>

        <section className="homeworker-booking-section" id="booking">
          <div className="booking-heading">
            <p className="homeworker-kicker">SUBMIT YOUR ASSIGNMENT</p>
            <h2>Begin with the brief.<br /><i>We'll take it from there.</i></h2>
            <p>Tell us what you need, when you need it, and what good work looks like to you.</p>
          </div>
          <div className="booking-panel">
            <form className="homeworker-booking-form" onSubmit={handleSubmit}>
              <div className="homeworker-form-section">
                <h3><span>01</span> Scope &amp; level</h3>
                <label htmlFor="homeworker-service">What do you need help with?</label>
                <select id="homeworker-service" value={selectedService} onChange={(e) => setSelectedService(e.target.value)} required>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · {formatPrice(rate, seller.currency || 'USD')} {pricing.pricingModel === 'per-page' ? 'per page' : 'per question'}
                  </option>
                ))}
                </select>

                <div className="homeworker-calc-row">
                  {pricing.pricingModel === 'per-page' ? (
                    <label htmlFor="homeworker-pages">Number of pages
                      <input id="homeworker-pages" type="number" min={1} max={100} value={pageCount} onChange={(e) => setPageCount(Number(e.target.value))} required />
                    </label>
                  ) : (
                    <label htmlFor="homeworker-questions">Number of questions
                      <input id="homeworker-questions" type="number" min={1} max={100} value={questionCount || 1} onChange={(e) => setQuestionCount(Number(e.target.value))} required />
                    </label>
                  )}
                  <label htmlFor="homeworker-level">Academic level
                    <select id="homeworker-level" value={academicLevel} onChange={(e) => setAcademicLevel(e.target.value)} required>
                      <option value="high-school">High School</option>
                      <option value="college">College</option>
                      <option value="university">University</option>
                      <option value="masters">Masters</option>
                      <option value="phd">PhD</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="homeworker-form-section">
                <h3><span>02</span> Deadline &amp; materials</h3>
                <div className="homeworker-calc-row">
                  <label htmlFor="homeworker-deadline-date">Deadline date
                    <input id="homeworker-deadline-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} required />
                  </label>
                  <label htmlFor="homeworker-deadline-time">Deadline time
                    <input id="homeworker-deadline-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
                  </label>
                </div>
                <label className="homeworker-upload-label" htmlFor="homeworker-assignment-files">Assignment files
                  <span className="homeworker-upload-drop">
                    <input id="homeworker-assignment-files" type="file" multiple accept=".pdf,.doc,.docx,.jpg,.png,.mp4" disabled={demoMode} onChange={handleFileChange} />
                    {demoMode ? (
                      <span className="upload-placeholder"><Upload size={20} /><span>File upload is disabled in preview mode.</span></span>
                    ) : files.length > 0 ? (
                      <span className="upload-preview-row">{files.map((file) => <span key={`${file.name}-${file.size}`} className="upload-preview-item"><FileText size={16} />{file.name}</span>)}</span>
                    ) : (
                      <span className="upload-placeholder"><Upload size={20} /><span>Choose files (PDF, Word, image, or video)</span></span>
                    )}
                  </span>
                </label>
                <label htmlFor="homeworker-instructions">Instructions
                  <textarea id="homeworker-instructions" rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Requirements, formatting notes, sources, or other context" />
                </label>
              </div>

              <div className="homeworker-form-section">
                <h3><span>03</span> Your contact details</h3>
                <div className="homeworker-contact-fields">
                  <label htmlFor="homeworker-name">Full name<input id="homeworker-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required /></label>
                  <label htmlFor="homeworker-email">Email<input id="homeworker-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
                  <label htmlFor="homeworker-phone">Phone<input id="homeworker-phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required /></label>
                </div>
              </div>

              <div className="homeworker-price-summary">
                <div><span>Total</span><strong>{formatPrice(totalPrice, seller.currency || 'USD')}</strong></div>
                <div className="homeworker-deposit-row"><span>Deposit allocation ({pricing.depositPercent}%)</span><strong>{formatPrice(deposit, seller.currency || 'USD')}</strong></div>
                <div className="homeworker-balance-row"><span>Balance on delivery</span><strong>{formatPrice(remaining, seller.currency || 'USD')}</strong></div>
              </div>

              {error && <p className="homeworker-form-error" role="alert">{error}</p>}
              {notice && <p className="homeworker-form-notice" role="status">{notice}</p>}

              <button className="homeworker-button homeworker-button-primary booking-submit" type="submit" disabled={busy || services.length === 0}>
                {busy ? 'Submitting…' : demoMode ? 'Preview submission' : 'Submit assignment'} {busy ? <span className="button-spinner" /> : <ArrowRight size={15} />}
              </button>
              <p className="booking-fineprint">{demoMode ? 'Preview only. No order or file will be sent.' : 'Your deposit and remaining balance are shown for clarity; any balance action remains in your student workspace.'}</p>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HomeworkerSite;

const landingSeller = createDemoHomeworkerSeller();
const landingServices = createDemoHomeworkerServices(landingSeller.id);

export const HomeworkerLandingPage: React.FC = () => (
  <HomeworkerSite seller={landingSeller} products={landingServices} demoMode />
);
