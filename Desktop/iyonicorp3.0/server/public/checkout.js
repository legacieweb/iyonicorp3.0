/**
 * IyonicPay Checkout Widget
 * Embed this script on your website to accept payments via IyonicPay
 * 
 * Usage:
 * <script src="https://your-server.com/checkout.js"></script>
 * <button data-iyonicpay-key="YOUR_API_KEY" data-amount="100" data-currency="USD">Pay with IyonicPay</button>
 */
(function() {
  'use strict';

  // Auto-detect server URL from script src
  const getServerUrl = function() {
    const scripts = document.querySelectorAll('script[src*="checkout"]');
    for (let script of scripts) {
      const match = script.src.match(/^(.+?)\/checkout\.js/);
      if (match) return match[1];
    }
    // Fallback
    return window.location.origin;
  };

  const IYONICPAY_BASE_URL = getServerUrl();
  const IYONICPAY_API_URL = IYONICPAY_BASE_URL + '/api';

  // Paystack inline script
  const PAYSTACK_SRC = 'https://js.paystack.co/v1/inline.js';

  let paystackLoaded = false;

  function loadPaystack() {
    return new Promise((resolve, reject) => {
      if (window.PaystackPop) {
        paystackLoaded = true;
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = PAYSTACK_SRC;
      script.onload = () => {
        paystackLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Paystack'));
      document.head.appendChild(script);
    });
  }

  function showModal(config) {
    return new Promise(async (resolve, reject) => {
      try {
        await loadPaystack();
        
        const handler = window.PaystackPop.setup({
          key: config.paystackPublicKey,
          email: config.email,
          amount: Math.round(config.amount * 100),
          currency: config.currency || 'USD',
          reference: config.reference,
          metadata: config.metadata || {},
          callback: (response) => {
            resolve(response);
          },
          onClose: () => {
            reject(new Error('Payment cancelled'));
          }
        });
        
        handler.openIframe();
      } catch (err) {
        reject(err);
      }
    });
  }

  async function initializePayment(apiKey, amount, currency, email, metadata = {}) {
    try {
      const response = await fetch(`${IYONICPAY_API_URL}/embed/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey
        },
        body: JSON.stringify({
          amount,
          currency: currency || 'USD',
          email,
          metadata
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to initialize payment');
      }

      return data;
    } catch (err) {
      console.error('IyonicPay Error:', err);
      throw err;
    }
  }

  async function verifyPayment(apiKey, reference) {
    try {
      const response = await fetch(`${IYONICPAY_API_URL}/embed/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey
        },
        body: JSON.stringify({ reference })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to verify payment');
      }

      return data;
    } catch (err) {
      console.error('IyonicPay Verify Error:', err);
      throw err;
    }
  }

  function createCheckoutButton(button) {
    const apiKey = button.dataset.iyonicpayKey;
    const amount = parseFloat(button.dataset.amount);
    const currency = button.dataset.currency || 'USD';
    const title = button.dataset.title || 'Payment';
    const description = button.dataset.description || '';

    if (!apiKey || !amount) {
      console.error('IyonicPay: Missing data-iyonicpay-key or data-amount');
      return;
    }

    // Store original content
    const originalContent = button.innerHTML;

    // Style the button
    button.style.cssText += '; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 24px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
        <line x1="1" y1="10" x2="23" y2="10"></line>
      </svg>
      ${originalContent || 'Pay with IyonicPay'}
    `;

    button.addEventListener('click', async function(e) {
      e.preventDefault();
      
      const btnText = button.innerHTML;
      button.innerHTML = '<span>Loading...</span>';
      button.disabled = true;

      try {
        // Get email from button or input
        let email = button.dataset.email;
        if (!email) {
          const emailInput = document.querySelector('[data-iyonicpay-email]');
          email = emailInput ? emailInput.value : '';
        }
        
        if (!email) {
          email = prompt('Please enter your email address:');
          if (!email) {
            throw new Error('Email is required');
          }
        }

        // Initialize payment
        const initData = await initializePayment(
          apiKey, 
          amount, 
          currency, 
          email, 
          { title, description }
        );

        if (!initData.status) {
          throw new Error(initData.message || 'Failed to initialize');
        }

        // Show Paystack modal
        const result = await showModal({
          paystackPublicKey: initData.paystackPublicKey,
          email: email,
          amount: amount,
          currency: currency,
          reference: initData.data.reference,
          metadata: initData.data.metadata
        });

        // Verify payment
        const verifyData = await verifyPayment(apiKey, result.reference);

        if (verifyData.success) {
          button.innerHTML = '<span>✓ Paid!</span>';
          button.style.background = '#10b981';
          
          // Dispatch success event
          button.dispatchEvent(new CustomEvent('iyonicpay-success', { 
            detail: { reference: result.reference, amount } 
          }));
          
          // Call custom callback
          if (button.dataset.onSuccess) {
            try {
              const customFn = new Function('event', button.dataset.onSuccess);
              customFn({ reference: result.reference, amount });
            } catch (e) {}
          }
        } else {
          throw new Error('Payment verification failed');
        }

      } catch (err) {
        button.innerHTML = btnText;
        button.disabled = false;
        
        button.dispatchEvent(new CustomEvent('iyonicpay-error', { 
          detail: { error: err.message } 
        }));
        
        console.error('IyonicPay Error:', err.message);
        alert(err.message || 'Payment failed. Please try again.');
      }
    });
  }

  function init() {
    const buttons = document.querySelectorAll('[data-iyonicpay-key]');
    
    buttons.forEach(button => {
      if (!button.dataset.iyonicpayInitialized) {
        button.dataset.iyonicpayInitialized = 'true';
        createCheckoutButton(button);
      }
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Watch for dynamically added buttons
  const observer = new MutationObserver(init);
  observer.observe(document.body, { childList: true, subtree: true });

  // Expose API
  window.IyonicPay = {
    init,
    createCheckoutButton,
    initializePayment,
    verifyPayment,
    showModal
  };
})();
