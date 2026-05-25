import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('Mailer Config:', { 
  host: process.env.SMTP_HOST, 
  user: process.env.SMTP_USER, 
  pass: process.env.SMTP_PASS ? '******' : 'MISSING' 
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP Connection Error:', error);
  } else {
    console.log('SMTP Server is ready to take messages');
  }
});

export const sendEmail = async ({ to, subject, text, html, from }) => {
  try {
    const info = await transporter.sendMail({
      from: from || `"IyoniCorp" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    // Don't throw error to prevent breaking the main flow
    return null;
  }
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

  // To Customer
  const customerSubject = `Order Placed at ${storeName} - #${order.id}`;
  const customerHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #10b981;">Thank you for your order!</h2>
      <p>Your order <strong>#${order.id}</strong> at <strong>${storeName}</strong> has been successfully placed.</p>
      <h3 style="border-bottom: 2px solid #eee; padding-bottom: 10px;">Order Details:</h3>
      <div style="margin: 20px 0;">
        ${items.map(item => `
          <div style="display: flex; align-items: center; padding: 15px 0; border-bottom: 1px solid #f0f0f0;">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-right: 15px;" />` : ''}
            <div>
              <strong>${item.name}</strong><br/>
              <span style="color: #666;">Qty: ${item.quantity} x $${item.price}</span>
            </div>
          </div>
        `).join('')}
      </div>
      <p style="font-size: 18px; font-weight: bold; text-align: right;">Total: $${order.total}</p>
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
        ${items.map(item => `
          <div style="display: flex; align-items: center; padding: 15px 0; border-bottom: 1px solid #f0f0f0;">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-right: 15px;" />` : ''}
            <div>
              <strong>${item.name}</strong><br/>
              <span style="color: #666;">Qty: ${item.quantity} x $${item.price}</span>
            </div>
          </div>
        `).join('')}
      </div>
      <p style="font-size: 18px; font-weight: bold; text-align: right;">Total Revenue: $${order.total}</p>
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
  const currency = invoice.currency || 'USD';
  const amountFormatted = `${currency} ${invoice.amount}`;

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
export const sendTransactionNotification = async (transaction, sender, receiver) => {
  const { amount, type, description } = transaction;

  // To Sender
  if (sender) {
    const senderSubject = `Transaction Notification - ${type}`;
    const senderHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Transaction Details</h2>
        <p>You have ${type === 'send' ? 'sent' : type === 'refund' ? 'refunded' : type} <strong>$${amount}</strong>.</p>
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
        <p>You have received <strong>$${amount}</strong> from ${sender ? sender.name : 'IyoniPay'}.</p>
        <p>Description: ${description || 'N/A'}</p>
      </div>
    `;
    await sendEmail({ to: receiver.email, subject: receiverSubject, html: receiverHtml });
  }
};

// Withdrawal Request
export const sendWithdrawalNotification = async (withdrawal, user, isAdmin = false) => {
  if (isAdmin) {
    const subject = `New Withdrawal Request - #${withdrawal.id}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>New Withdrawal Request</h2>
        <p>User: ${user.name} (${user.email})</p>
        <p>Amount: $${withdrawal.amount}</p>
        <p>Bank Details: ${withdrawal.bank_details}</p>
        <p><a href="${process.env.VITE_APP_URL}/admin/withdrawals" style="padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Process Withdrawal</a></p>
      </div>
    `;
    return sendEmail({ to: process.env.VITE_ADMIN_EMAIL, subject, html });
  } else {
    const subject = `Withdrawal Request Received - #${withdrawal.id}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2>Withdrawal Request</h2>
        <p>Your withdrawal request for <strong>$${withdrawal.amount}</strong> has been received and is being processed.</p>
        <p>Status: ${withdrawal.status}</p>
      </div>
    `;
    return sendEmail({ to: user.email, subject, html });
  }
};

// Refund Request Email
export const sendRefundRequestEmail = async (customer, seller, order, adminEmail) => {
  const items = (typeof order.items === 'string' ? JSON.parse(order.items || '[]') : order.items) || [];
  const storeName = seller.storeName || 'the store';
  const currency = order.currency || 'USD';
  const amountFormatted = `${currency} ${order.total}`;

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
        ${items.map(item => `
          <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; margin-right: 12px;" />` : ''}
            <div>
              <strong>${item.name}</strong><br/>
              <span style="color: #666;">Qty: ${item.quantity} x ${currency} ${item.price}</span>
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
        ${items.map(item => `
          <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; margin-right: 12px;" />` : ''}
            <div>
              <strong>${item.name}</strong><br/>
              <span style="color: #666;">Qty: ${item.quantity} x ${currency} ${item.price}</span>
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
  const amountFormatted = `${currency} ${amount}`;
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
  const amountFormatted = `${currency} ${amount}`;

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
  const amountFormatted = `${currency} ${amount}`;

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
