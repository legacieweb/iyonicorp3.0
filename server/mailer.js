import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER?.trim();
const smtpPass = process.env.SMTP_PASS?.trim();

const smtpConfigured = Boolean(smtpUser && smtpPass);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      requireTLS: smtpPort === 587,

      auth: {
        user: smtpUser,
        pass: smtpPass,
      },

      tls: {
        minVersion: 'TLSv1.2',
      },
    })
  : null;

if (!smtpConfigured) {
  console.warn(
    'SMTP is not configured. Set SMTP_USER and SMTP_PASS in the backend .env file.'
  );
} else {
  console.log(`SMTP configured for ${smtpUser} via ${smtpHost}:${smtpPort}`);
}



if (transporter) {
  transporter.verify()
    .then(() => {
      console.log('✅ Gmail SMTP authentication successful');
    })
    .catch((error) => {
      console.error('❌ Gmail SMTP authentication failed');
      console.error('Code:', error.code);
      console.error('Response:', error.response);
    });
}

// Build a nodemailer transporter from email marketing settings
export const createTransporterFromSettings = (settings) => {
  if (!settings) return null;

  if (settings.provider === 'smtp') {
    return nodemailer.createTransport({
      host: settings.smtp_host,
      port: settings.smtp_port || 587,
      secure: settings.smtp_port === 465,
      auth: {
        user: settings.smtp_user,
        pass: settings.smtp_password
      }
    });
  } else if (settings.provider === 'sendgrid') {
    return nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        apiKey: settings.api_key
      }
    });
  } else if (settings.provider === 'mailgun') {
    return nodemailer.createTransport({
      service: 'Mailgun',
      auth: {
        apiKey: settings.api_key,
        domain: settings.domain || 'mg.yourdomain.com'
      }
    });
  } else if (settings.provider === 'aws-ses') {
    return nodemailer.createTransport({
      host: `email.${settings.region}.amazonaws.com`,
      port: 587,
      secure: false,
      auth: {
        user: settings.access_key_id,
        pass: settings.secret_access_key
      }
    });
  } else if (settings.provider === 'brevo' || settings.provider === 'sendinblue') {
    return nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      auth: {
        user: settings.api_key,
        pass: ''
      }
    });
  } else if (settings.provider === 'postmark') {
    return nodemailer.createTransport({
      host: 'smtp.postmarkapp.com',
      port: 587,
      auth: {
        user: settings.api_key,
        pass: settings.api_key
      }
    });
  }

  return null;
};

// Currency conversion rates to USD (for admin dashboard aggregation)
export const CURRENCY_RATES_TO_USD = {
  'USD': 1,
  'KES': 125,
  'EUR': 0.92,
  'GBP': 0.79,
  'NGN': 1500,
  'GHS': 13
};

// Format price with proper currency symbol and formatting
export const formatPrice = (amount, currency = 'USD') => {
  const upperCurrency = (currency || 'USD').toUpperCase();
  const locale = upperCurrency === 'KES' ? 'en-KE' : upperCurrency === 'EUR' ? 'de-DE' : upperCurrency === 'GBP' ? 'en-GB' : upperCurrency === 'NGN' ? 'en-NG' : upperCurrency === 'GHS' ? 'en-GH' : 'en-US';
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: upperCurrency }).format(amount);
  } catch (e) {
    return `${upperCurrency} ${Number(amount).toFixed(2)}`;
  }
};

// Convert any currency to USD for admin dashboard
export const convertToUSD = (amount, fromCurrency) => {
  const rate = CURRENCY_RATES_TO_USD[(fromCurrency || 'USD').toUpperCase()] || 1;
  return amount / rate;
};

export const sendEmail = async ({ to, subject, text, html, from }) => {
  if (!transporter) {
    console.error(`Email not sent: SMTP is not configured for ${to}`);
    return null;
  }

  try {
    const info = await transporter.sendMail({
      from: from || `"IyoniCorp" <${smtpUser}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      console.error('SMTP authentication failed. For Gmail, ensure 2FA is enabled and SMTP_PASS is a valid 16-character app password for SMTP_USER.');
    } else {
      console.error('Error sending email:', error.message || error);
    }
    console.error(`Email delivery failed for ${to}`);
    return null;
  }
};

export const sendAccountStatusEmail = async (user, suspended) => {
  const action = suspended ? 'suspended' : 'restored';
  const subject = suspended
    ? 'Your IyoniCorp account has been suspended'
    : 'Your IyoniCorp account has been restored';
  const headingColor = suspended ? '#dc2626' : '#059669';
  const nextStep = suspended
    ? 'You have been signed out of active sessions and will not be able to sign in until support restores your account.'
    : 'You can sign in again now. Your account access and active sessions have been restored.';

  return sendEmail({
    to: user.email,
    subject,
    text: `Hello ${user.name || 'there'}, your IyoniCorp account has been ${action}. ${nextStep}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; color: #1f2937;">
        <div style="border-top: 6px solid ${headingColor}; padding-top: 24px;">
          <h1 style="color: ${headingColor}; margin-bottom: 12px;">Account ${suspended ? 'Suspended' : 'Restored'}</h1>
          <p>Hello ${user.name || 'there'},</p>
          <p>Your IyoniCorp account has been <strong>${action}</strong> by an administrator.</p>
          <p>${nextStep}</p>
          <p style="margin-top: 32px; color: #6b7280; font-size: 13px;">If you believe this was a mistake, please contact support.</p>
        </div>
      </div>
    `
  });
};

// --- Email Templates ---

// Welcome Emails
export const sendWelcomeEmail = async (user, platform = 'IyoniCorp') => {
  const subject = `Welcome to ${platform}!`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2>Welcome, ${user.name}!</h2>
      <p>Thank you for signing up to <strong>${platform}</strong>.</p>
      <p>We're excited to have you with us!</p>
      <hr />
      <p>If you have any questions, feel free to reply to this email.</p>
    </div>
  `;
  return sendEmail({ to: user.email, subject, html });
};

// Order Emails
export const sendOrderNotification = async (order, customer, seller) => {
  const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  const storeName = seller.storeName || 'the store';
  const sellerCurrency = order.currency || seller.currency || 'USD';

  const formatItem = (item) => {
    const itemCurrency = item.currency || sellerCurrency;
    return {
      name: item.name || item.productName || item.product_name || 'Product',
      image: item.image || item.images?.[0] || null,
      quantity: item.quantity || 1,
      price: formatPrice(item.price || 0, itemCurrency)
    };
  };

  // To Customer
  const customerSubject = `Order Placed at ${storeName} - #${order.id}`;
  const formattedItems = items.map(formatItem);
  const totalFormatted = formatPrice(order.total, sellerCurrency);
  const customerHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Thank you for your order!</h2>
      <p>Your order <strong>#${order.id}</strong> at <strong>${storeName}</strong> has been successfully placed.</p>
      <h3 style="border-bottom: 2px solid #eee; padding-bottom: 10px;">Order Details:</h3>
      <div style="margin: 20px 0;">
        ${formattedItems.map(item => `
          <div style="display: flex; align-items: center; padding: 15px 0; border-bottom: 1px solid #f0f0f0;">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-right: 15px;" />` : ''}
            <div>
              <strong>${item.name}</strong><br/>
              <span style="color: #666;">Qty: ${item.quantity} x ${item.price}</span>
            </div>
          </div>
        `).join('')}
      </div>
      <p style="font-size: 18px; font-weight: bold; text-align: right;">Total: ${totalFormatted}</p>
      <p style="margin-top: 20px;">Status: <strong>${order.status}</strong></p>
    </div>
  `;
  await sendEmail({ to: customer.email, subject: customerSubject, html: customerHtml });

  // To Seller
  const sellerSubject = `New Order Received - #${order.id}`;
  const sellerHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">New Order Received!</h2>
      <p>You have received a new order <strong>#${order.id}</strong> from ${customer.name} at your store <strong>${storeName}</strong>.</p>
      <h3 style="border-bottom: 2px solid #eee; padding-bottom: 10px;">Order Details:</h3>
      <div style="margin: 20px 0;">
        ${formattedItems.map(item => `
          <div style="display: flex; align-items: center; padding: 15px 0; border-bottom: 1px solid #f0f0f0;">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-right: 15px;" />` : ''}
            <div>
              <strong>${item.name}</strong><br/>
              <span style="color: #666;">Qty: ${item.quantity} x ${item.price}</span>
            </div>
          </div>
        `).join('')}
      </div>
      <p style="font-size: 18px; font-weight: bold; text-align: right;">Total Revenue: ${totalFormatted}</p>
      <p style="text-align: center; margin-top: 20px;"><a href="${process.env.VITE_APP_URL}/seller/orders/${order.id}" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">View Order</a></p>
    </div>
  `;
  if (seller.email) {
    await sendEmail({ to: seller.email, subject: sellerSubject, html: sellerHtml });
  }
};

// Invoice Payment Notification
export const sendInvoicePaymentNotification = async (invoice, customer, seller) => {
  const storeName = seller.storeName || 'the store';
  const currency = invoice.currency || seller.currency || 'USD';
  const amountFormatted = formatPrice(invoice.amount, currency);

  // To Customer
  const customerSubject = `Payment Confirmed - Invoice from ${storeName}`;
  const customerHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2>Payment Successful!</h2>
      <p>Your payment of <strong>${amountFormatted}</strong> to <strong>${storeName}</strong> has been confirmed.</p>
      <p><strong>Invoice Description:</strong> ${invoice.description || 'N/A'}</p>
      <p><strong>Invoice ID:</strong> ${invoice.id}</p>
      <p>Thank you for your payment!</p>
    </div>
  `;
  await sendEmail({ to: customer.email, subject: customerSubject, html: customerHtml });

  // To Seller
  const sellerSubject = `Payment Received - ${amountFormatted}`;
  const sellerHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2>Payment Received!</h2>
      <p>You received a payment of <strong>${amountFormatted}</strong> from <strong>${customer.name}</strong>.</p>
      <p><strong>Invoice Description:</strong> ${invoice.description || 'N/A'}</p>
      <p><strong>Invoice ID:</strong> ${invoice.id}</p>
    </div>
  `;
  if (seller.email) {
    await sendEmail({ to: seller.email, subject: sellerSubject, html: sellerHtml });
  }
};

// Order Status Update
export const sendOrderStatusUpdate = async (order, customer) => {
  const subject = `Order Status Updated - #${order.id}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2>Order Status Update</h2>
      <p>The status of your order <strong>#${order.id}</strong> has been updated to: <strong>${order.status}</strong></p>
      <p><a href="${process.env.VITE_APP_URL}/customer/orders/${order.id}" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">View Order Status</a></p>
    </div>
  `;
  return sendEmail({ to: customer.email, subject, html });
};

// Transaction Emails
export const sendTransactionNotification = async (transaction, sender, receiver, currency = 'USD') => {
  const { amount, type, description } = transaction;
  const amountFormatted = formatPrice(amount, currency);

  // To Sender
  if (sender) {
    const senderSubject = `Transaction Notification - ${type}`;
    const senderHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Transaction Details</h2>
        <p>You have ${type === 'send' ? 'sent' : type === 'refund' ? 'refunded' : type} <strong>${amountFormatted}</strong>.</p>
        <p>Description: ${description || 'N/A'}</p>
        <p>Current Balance: Your wallet has been updated.</p>
      </div>
    `;
    await sendEmail({ to: sender.email, subject: senderSubject, html: senderHtml });
  }

  // To Receiver
  if (receiver) {
    const receiverSubject = `Payment Received - ${type}`;
    const receiverHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Payment Received!</h2>
        <p>You have received <strong>${amountFormatted}</strong> from ${sender ? sender.name : 'IyoniPay'}.</p>
        <p>Description: ${description || 'N/A'}</p>
      </div>
    `;
    await sendEmail({ to: receiver.email, subject: receiverSubject, html: receiverHtml });
  }
};

// Withdrawal Request
export const sendWithdrawalNotification = async (withdrawal, user, isAdmin = false, currency = 'USD') => {
  const bd = withdrawal.bank_details || {};
  const method = bd.method || 'bank';
  const isMobileWallet = method === 'mobile_wallet';
  const walletCurrency = (bd.walletCurrency || currency || 'USD').toUpperCase();
  const requestedCurrency = (bd.requestedCurrency || walletCurrency).toUpperCase();
  const requestedAmount = Number(bd.requestedAmount || withdrawal.amount || 0);
  const walletAmount = Number(bd.walletAmount || withdrawal.amount || 0);

  if (isAdmin) {
    const subject = `New Withdrawal Request - #${withdrawal.id}`;
    const payoutDetails = isMobileWallet
      ? `<li><strong>Provider:</strong> ${bd.walletProvider || 'N/A'}</li><li><strong>Wallet Number:</strong> ${bd.walletNumber || 'N/A'}</li><li><strong>Account Name:</strong> ${bd.accountName || 'N/A'}</li>`
      : `<li><strong>Bank:</strong> ${bd.bankName || 'N/A'}</li><li><strong>Account No:</strong> ${bd.accountNo || 'N/A'}</li><li><strong>Account Name:</strong> ${bd.accountName || 'N/A'}</li>`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">New Withdrawal Request</h2>
        <p><strong>Requestor:</strong> ${user.name || 'Unknown'} (${user.email})</p>
        <p><strong>Amount:</strong> ${formatPrice(walletAmount, walletCurrency)} (${formatPrice(requestedAmount, requestedCurrency)})</p>
        <p><strong>Method:</strong> ${isMobileWallet ? 'Mobile Wallet' : 'Bank Transfer'}</p>
        <p><strong>Payout Details:</strong></p>
        <ul>${payoutDetails}${bd.country ? `<li><strong>Country:</strong> ${bd.country}</li>` : ''}</ul>
        <p><strong>Withdrawal ID:</strong> ${withdrawal.id}</p>
        <p style="text-align: center; margin-top: 20px;">
          <a href="${process.env.VITE_APP_URL}/admin/withdrawals" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Process Withdrawal</a>
        </p>
      </div>
    `;
    return sendEmail({ to: process.env.VITE_ADMIN_EMAIL, subject, html });
  }
  const amountFormatted = formatPrice(requestedAmount, requestedCurrency);
  const amountUSD = formatPrice(Number(bd.walletAmount || withdrawal.amount || 0) / (CURRENCY_RATES_TO_USD[walletCurrency] || 1), 'USD');
  const subject = `Withdrawal Request Received - #${withdrawal.id}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">Withdrawal Request Submitted</h2>
      <p>Hello ${user.name || 'there'},</p>
      <p>Your withdrawal request for <strong>${amountFormatted}</strong> (${amountUSD} USD) has been received and is being processed.</p>
      <p><strong>Status:</strong> ${withdrawal.status || 'pending'}</p>
      <p>We will notify you once your withdrawal has been confirmed or rejected.</p>
    </div>
  `;
  return sendEmail({ to: user.email, subject, html });
};

// Withdrawal Status Update
export const sendWithdrawalStatusUpdateEmail = async (withdrawal, user, newStatus, currency = 'USD') => {
  const bd = withdrawal.bank_details || {};
  const walletCurrency = (bd.walletCurrency || currency || 'USD').toUpperCase();
  const requestedCurrency = (bd.requestedCurrency || walletCurrency).toUpperCase();
  const amount = Number(bd.requestedAmount || withdrawal.amount || 0);
  const amountFormatted = formatPrice(amount, requestedCurrency);
  const amountUSD = formatPrice(Number(bd.walletAmount || withdrawal.amount || 0) / (CURRENCY_RATES_TO_USD[walletCurrency] || 1), 'USD');

  const statusLabel = newStatus === 'completed' ? 'Confirmed' : newStatus === 'failed' ? 'Rejected' : 'Updated';
  const color = newStatus === 'completed' ? '#10b981' : newStatus === 'failed' ? '#ef4444' : '#3b82f6';
  const subject = `Withdrawal ${statusLabel} - #${withdrawal.id}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${color};">Withdrawal ${statusLabel}</h2>
      <p>Hello ${user.name || 'there'},</p>
      ${newStatus === 'completed'
        ? `<p>Your withdrawal request for <strong>${amountFormatted}</strong> (${amountUSD} USD) has been <strong>confirmed</strong> and is being processed.</p>
           <p>The funds will be sent to your payout method shortly.</p>`
        : `<p>Your withdrawal request for <strong>${amountFormatted}</strong> (${amountUSD} USD) has been <strong>${newStatus === 'failed' ? 'rejected' : 'updated'}</strong>.</p>
           ${newStatus === 'failed' ? '<p>Please contact support if you have any questions.</p>' : ''}`
      }
      <p><strong>Withdrawal ID:</strong> ${withdrawal.id}</p>
      <p style="text-align: center; margin-top: 20px;">
        <a href="${process.env.VITE_APP_URL}/#/iyonicpay?tab=withdrawals" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">View in Dashboard</a>
      </p>
    </div>
  `;
  return sendEmail({ to: user.email, subject, html });
};

// Refund Request Email
export const sendRefundRequestEmail = async (customer, seller, order, adminEmail) => {
  const items = (typeof order.items === 'string' ? JSON.parse(order.items || '[]') : order.items) || [];
  const storeName = seller.storeName || 'the store';
  const currency = order.currency || 'USD';
  const amountFormatted = formatPrice(order.total, currency);

  const formatRefundItem = (item) => ({
    name: item.name || item.productName || item.product_name || 'Product',
    image: item.image || item.images?.[0] || null,
    quantity: item.quantity || 1,
    price: formatPrice(item.price || 0, currency)
  });

  const formattedItems = items.map(formatRefundItem);

  // To Customer
  const customerSubject = `Refund Request Submitted - Order #${order.id} at ${storeName}`;
  const customerHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #f59e0b;">Refund Request Submitted</h2>
      <p>Hello ${customer.name},</p>
      <p>Your refund request for order <strong>#${order.id}</strong> at <strong>${storeName}</strong> has been submitted.</p>
      <p><strong>Reason:</strong> ${order.reason || 'Not provided'}</p>
      <p>We will review your request and get back to you soon.</p>
      <hr style="margin: 20px 0;">
      <h3>Order Details:</h3>
      <div style="margin: 20px 0;">
        ${formattedItems.map(item => `
          <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; margin-right: 12px;" />` : ''}
            <div>
              <strong>${item.name}</strong><br/>
              <span style="color: #666;">Qty: ${item.quantity} x ${item.price}</span>
            </div>
          </div>
        `).join('')}
      </div>
      <p style="font-size: 16px; font-weight: bold;">Order Total: ${amountFormatted}</p>
    </div>
  `;
  await sendEmail({ to: customer.email, subject: customerSubject, html: customerHtml });

  // To Seller
  const sellerSubject = `Refund Request - Order #${order.id} from ${customer.name}`;
  const sellerHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ef4444;">New Refund Request</h2>
      <p>You have received a refund request from <strong>${customer.name}</strong>.</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Reason:</strong> ${order.reason || 'Not provided'}</p>
      <hr style="margin: 20px 0;">
      <h3>Order Details:</h3>
      <div style="margin: 20px 0;">
        ${formattedItems.map(item => `
          <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; margin-right: 12px;" />` : ''}
            <div>
              <strong>${item.name}</strong><br/>
              <span style="color: #666;">Qty: ${item.quantity} x ${item.price}</span>
            </div>
          </div>
        `).join('')}
      </div>
      <p style="font-size: 16px; font-weight: bold;">Order Total: ${amountFormatted}</p>
      <p style="text-align: center; margin-top: 20px;">
        <a href="${process.env.VITE_APP_URL}/seller/orders/${order.id}" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Review Refund Request</a>
      </p>
    </div>
  `;
  if (seller.email) {
    await sendEmail({ to: seller.email, subject: sellerSubject, html: sellerHtml });
  }

  // To Admin
  const adminSubject = `Refund Request - Order #${order.id} from ${storeName}`;
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #ef4444;">New Refund Request</h2>
      <p>A refund request has been submitted that requires admin attention.</p>
      <p><strong>Store:</strong> ${storeName}</p>
      <p><strong>Customer:</strong> ${customer.name} (${customer.email})</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Amount:</strong> ${amountFormatted}</p>
      <p><strong>Reason:</strong> ${order.reason || 'Not provided'}</p>
      <p style="text-align: center; margin-top: 20px;">
        <a href="${process.env.VITE_APP_URL}/admin/refunds" style="padding: 10px 20px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 5px;">View in Admin Dashboard</a>
      </p>
    </div>
  `;
  if (adminEmail) {
    await sendEmail({ to: adminEmail, subject: adminSubject, html: adminHtml });
  }
};

// Cheque Emails
export const sendChequeIssuedEmail = async ({ issuer, recipientEmail, amount, currency, token, pin, includePin }) => {
  const amountFormatted = formatPrice(amount, currency);
  const claimUrl = `${process.env.VITE_APP_URL}/#/iyonicpay?tab=cheques&claim=${token}`;

  // To Issuer
  const issuerSubject = `Digital Cheque Issued - ${amountFormatted}`;
  const issuerHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #4f46e5;">Cheque Issued Successfully</h2>
      <p>You have issued a digital cheque for <strong>${amountFormatted}</strong>.</p>
      <p><strong>Recipient:</strong> ${recipientEmail || 'Anyone with the link & PIN'}</p>
      <p><strong>Token:</strong> ${token}</p>
      <p><strong>Claim Link:</strong> <a href="${claimUrl}">${claimUrl}</a></p>
      <p style="color: #ef4444; font-weight: bold;">Security: Keep your PIN secret unless you've chosen to include it in the recipient's email.</p>
    </div>
  `;
  await sendEmail({ to: issuer.email, subject: issuerSubject, html: issuerHtml });

  // To Recipient (if email provided)
  if (recipientEmail) {
    const recipientSubject = `You received a Digital Cheque - ${amountFormatted}`;
    const recipientHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #10b981;">Funds Received!</h2>
        <p><strong>${issuer.name}</strong> has sent you a digital cheque for <strong>${amountFormatted}</strong>.</p>
        <p>You can claim this money directly into your IyonicPay wallet.</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <p><strong>Token:</strong> ${token}</p>
          ${includePin ? `<p><strong>Security PIN:</strong> ${pin}</p>` : '<p><em>Please ask the sender for the 4-digit security PIN to claim.</em></p>'}
          <p style="margin-top: 15px;"><a href="${claimUrl}" style="background: #4f46e5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">Claim My Funds</a></p>
        </div>
        <p style="font-size: 12px; color: #666;">New to IyonicPay? Simply create an account after clicking the link above to claim your money.</p>
      </div>
    `;
    await sendEmail({ to: recipientEmail, subject: recipientSubject, html: recipientHtml });
  }
};

export const sendChequeClaimedEmail = async ({ issuer, claimer, amount, currency, token }) => {
  const amountFormatted = formatPrice(amount, currency);

  // To Issuer
  const issuerSubject = `Cheque Claimed - ${amountFormatted}`;
  const issuerHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #10b981;">Cheque Cashed Out!</h2>
      <p>The digital cheque you issued (Token: ${token}) for <strong>${amountFormatted}</strong> has been successfully claimed by <strong>${claimer.name}</strong> (${claimer.email}).</p>
      <p>The funds have been transferred from escrow to their wallet.</p>
    </div>
  `;
  await sendEmail({ to: issuer.email, subject: issuerSubject, html: issuerHtml });

  // To Claimer
  const claimerSubject = `Funds Claimed Successfully - ${amountFormatted}`;
  const claimerHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #10b981;">Success!</h2>
      <p>You have successfully claimed <strong>${amountFormatted}</strong> from the cheque issued by ${issuer.name}.</p>
      <p>The funds are now available in your IyonicPay balance.</p>
      <p><a href="${process.env.VITE_APP_URL}/#/iyonicpay" style="color: #4f46e5; font-weight: bold;">View My Dashboard</a></p>
    </div>
  `;
  await sendEmail({ to: claimer.email, subject: claimerSubject, html: claimerHtml });
};

export const sendChequeExpiredEmail = async ({ issuer, amount, currency, token }) => {
  const amountFormatted = formatPrice(amount, currency);

  const subject = `Cheque Expired & Refunded - ${amountFormatted}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #f59e0b;">Cheque Expired</h2>
      <p>The digital cheque you issued (Token: ${token}) for <strong>${amountFormatted}</strong> has expired without being claimed.</p>
      <p style="font-weight: bold; color: #10b981;">The full amount has been automatically refunded to your IyonicPay wallet balance.</p>
    </div>
  `;
  await sendEmail({ to: issuer.email, subject, html });
};

export const sendSubscriptionReminderEmail = async ({ user, platform, planName, price, renewalDate }) => {
  const subject = `Subscription Renewal Reminder - ${platform}`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #4f46e5;">Subscription Renewal Reminder</h2>
      <p>Hi ${user.name || user.email},</p>
      <p>This is a reminder that your <strong>${platform}</strong> subscription (<strong>${planName}</strong>) will renew on <strong>${new Date(renewalDate).toLocaleDateString()}</strong>.</p>
      <p>The renewal charge will be <strong>${price.toFixed(2)} USD</strong> from your IyonicPay wallet.</p>
      <p>Please ensure your wallet has sufficient balance, or disable auto-renewal in your <a href="${process.env.VITE_APP_URL || 'http://localhost:4000'}/#/iyonicpay?tab=my-bills" style="color: #4f46e5; font-weight: bold;">My Bills</a> section.</p>
      <p style="margin-top: 20px;">Thank you for using IyonicCorp.</p>
    </div>
  `;
  await sendEmail({ to: user.email, subject, html });
};
