import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation, useSearchParams, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpenText, GraduationCap } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { Product, Seller, productsAPI, sellersAPI } from '../../../../services/api';
import { formatPrice } from '../../../../utils/currency';
import { createDemoHomeworkerSeller, createDemoHomeworkerServices, getHomeworkerSettings } from './homeworkerTypes';
import './homeworker.css';

interface LocationState { service?: Product; seller?: Seller; demoMode?: boolean; from?: string }

const HomeworkerServicePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { serviceId } = useParams<{ serviceId?: string }>();
  const state = (location.state as LocationState) || {};
  const demoMode = state.demoMode === true || searchParams.get('demo') === 'true';
  const sellerId = searchParams.get('seller') || state?.seller?.id || (demoMode ? 'demo-seller' : undefined);
  const from = searchParams.get('from') || state.from;

  const [service, setService] = useState<Product | null>(state?.service || null);
  const [seller, setSeller] = useState<Seller | null>(state?.seller || null);
  const [loading, setLoading] = useState(!service || !seller);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (service && seller) {
      setLoading(false);
      return;
    }
    if (demoMode && sellerId === 'demo-seller') {
      const demoService = createDemoHomeworkerServices(sellerId).find((item) => item.id === serviceId) || null;
      setSeller(createDemoHomeworkerSeller());
      setService(demoService);
      if (!demoService) setError('This preview service could not be found.');
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
    ]).then(([resolvedSeller, products]) => {
      if (!active) return;
      setSeller(resolvedSeller);
      if (!service) {
        const found = (products as Product[]).find((p) => p.id === serviceId && p.type === 'service');
        setService(found || null);
      }
      setLoading(false);
    }).catch(() => {
      if (active) {
        setError('This service could not be found.');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [demoMode, serviceId, sellerId, service, seller, navigate]);

  const settings = seller ? getHomeworkerSettings(seller) : null;
  const rate = settings
    ? settings.pricingModel === 'per-page'
      ? (demoMode ? settings.pricePerPage || 18 : settings.pricePerPage)
      : (demoMode ? settings.pricePerQuestion || 4 : settings.pricePerQuestion)
    : 0;

  const handleBack = () => {
    if (from && from.startsWith('/')) {
      navigate(from, { replace: true });
    } else {
      window.location.href = `/shop/${seller?.subdomain || ''}`;
    }
  };

  if (loading) {
    return <div className="homeworker-site"><div className="homeworker-service-page-loading"><div className="loading-spinner" /><p>Loading the service details…</p></div></div>;
  }
  if (!service || !seller) {
    return <div className="homeworker-site"><div className="homeworker-service-page-loading" role="alert">{error || 'This service could not be found.'}</div></div>;
  }

  return (
    <div className="homeworker-site">
      <header className="homeworker-header">
        <button className="homeworker-wordmark" onClick={handleBack} aria-label="Back to Homeworker">
          <span className="wordmark-mark"><BookOpenText size={20} /></span>
          <span>Homeworker</span>
        </button>
        <button className="homeworker-detail-back" onClick={handleBack}><ArrowLeft size={15} /> Back to services</button>
      </header>

      <main className="homeworker-service-page">
        <p className="homeworker-kicker service-detail-kicker">SUBJECT-MATCHED SUPPORT / {service.category || 'ACADEMIC SUPPORT'}</p>
        <div className="service-detail-layout">
          <div className="service-detail-media">
            {service.images && service.images.length > 0 ? (
              <img src={service.images[0]} alt={service.name} className="service-detail-image" />
            ) : (
              <div className="service-detail-placeholder" role="img" aria-label={`Assignment brief cover for ${service.name}`}>
                <div className="service-cover-back" />
                <article className="service-cover-sheet">
                  <div className="service-cover-top"><span>HOMEWORKER / FIELD NOTES</span><GraduationCap size={16} /></div>
                  <p>ACADEMIC SUPPORT / 01</p>
                  <BookOpenText size={26} />
                  <h2>{service.category || 'A clear way forward'}</h2>
                  <span>{service.name}</span>
                  <div className="service-cover-rule" />
                  <small>Start with a good question.</small>
                </article>
              </div>
            )}
          </div>
          <div className="service-detail-content">
            <p className="homeworker-kicker">{service.category || 'THE HOMEWORKER EDIT'}</p>
            <h1 className="service-detail-title">{service.name}</h1>
            <p className="service-detail-description">{service.description || 'Expert homework help for any assignment, any subject, any level.'}</p>
            {rate > 0 && (
              <p className="service-detail-price">
                {formatPrice(rate, seller.currency || 'USD')}{settings?.pricingModel === 'per-page' ? ' per page' : ' per question'}
              </p>
            )}
            <div className="service-detail-points"><span><span>01</span> Set your deadline</span><span><span>02</span> Share your materials</span><span><span>03</span> Follow progress in your workspace</span></div>
            <button
              className="homeworker-button homeworker-button-primary"
              onClick={() => navigate(state.from || `/shop/${seller.subdomain}`, { replace: true, state: { scrollToBooking: true } })}
            >
              Begin your submission <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomeworkerServicePage;
