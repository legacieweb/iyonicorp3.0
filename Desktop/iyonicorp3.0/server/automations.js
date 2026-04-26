import db from './db.js';
import * as mailer from './mailer.js';
import nodemailer from 'nodemailer';

/**
 * Trigger an automation based on an event
 * @param {string} event - The event name (e.g., 'order_placed', 'customer_registered')
 * @param {object} data - Data associated with the event
 */
export const triggerAutomation = async (event, data) => {
  try {
    const { sellerId, customerEmail, email } = data;
    const recipientEmail = customerEmail || email;
    if (!sellerId || !recipientEmail) {
      console.log('Missing sellerId or recipient email, skipping automation');
      return;
    }

    console.log(`Triggering automation for event: ${event}`, data);

    // Get seller's email settings
    const settingsRes = await db.query(
      'SELECT * FROM email_marketing_settings WHERE seller_id = $1 AND is_active = TRUE',
      [sellerId]
    );

    let transporter;
    let fromEmail;
    let fromName = 'Store';

    if (settingsRes.rows.length > 0) {
      const settings = settingsRes.rows[0];
      fromEmail = settings.from_email;
      fromName = settings.from_name || 'Store';

      // Create transporter based on provider
      if (settings.provider === 'smtp') {
        transporter = nodemailer.createTransport({
          host: settings.smtp_host,
          port: settings.smtp_port || 587,
          secure: settings.smtp_port === 465,
          auth: {
            user: settings.smtp_user,
            pass: settings.smtp_password
          }
        });
      } else if (settings.provider === 'sendgrid') {
        transporter = nodemailer.createTransport({
          service: 'SendGrid',
          auth: {
            apiKey: settings.api_key
          }
        });
      } else if (settings.provider === 'mailgun') {
        transporter = nodemailer.createTransport({
          service: 'Mailgun',
          auth: {
            apiKey: settings.api_key,
            domain: settings.domain || 'mg.yourdomain.com'
          }
        });
      } else if (settings.provider === 'aws-ses') {
        transporter = nodemailer.createTransport({
          host: `email.${settings.region}.amazonaws.com`,
          port: 587,
          secure: false,
          auth: {
            user: settings.access_key_id,
            pass: settings.secret_access_key
          }
        });
      } else if (settings.provider === 'brevo' || settings.provider === 'sendinblue') {
        transporter = nodemailer.createTransport({
          host: 'smtp-relay.brevo.com',
          port: 587,
          auth: {
            user: settings.api_key,
            pass: ''
          }
        });
      } else if (settings.provider === 'postmark') {
        transporter = nodemailer.createTransport({
          host: 'smtp.postmarkapp.com',
          port: 587,
          auth: {
            user: settings.api_key,
            pass: settings.api_key
          }
        });
      } else {
        // Default to system mailer
        const { sendEmail } = await import('./mailer.js');
        transporter = { sendMail: sendEmail };
      }
    } else {
      console.log(`No active email settings for seller ${sellerId}, using system mailer`);
      // Use system mailer if no settings configured
      const { sendEmail } = await import('./mailer.js');
      transporter = { sendMail: sendEmail };
      fromEmail = process.env.SMTP_USER;
    }

    // Find the relevant template for this event
    let templateSlug = '';
    switch (event) {
      case 'order_placed':
        templateSlug = 'order-confirmation';
        break;
      case 'customer_registered':
        templateSlug = 'welcome-email';
        break;
      case 'order_shipped':
        templateSlug = 'shipping-notification';
        break;
      case 'cart_abandoned':
        templateSlug = 'abandoned-cart';
        break;
      case 'refund_requested':
        templateSlug = 'refund-request';
        break;
      default:
        console.log(`Unknown event: ${event}`);
        return;
    }

    const templateRes = await db.query(
      'SELECT * FROM email_templates WHERE (seller_id = $1 OR is_default = TRUE) AND slug = $2 AND is_active = TRUE ORDER BY is_default ASC LIMIT 1',
      [sellerId, templateSlug]
    );

    if (templateRes.rows.length === 0) {
      console.log(`No template found for slug ${templateSlug}`);
      return;
    }

    const template = templateRes.rows[0];

    // Get seller info for store name
    const sellerRes = await db.query('SELECT store_name FROM sellers WHERE id = $1', [sellerId]);
    const storeName = sellerRes.rows[0]?.store_name || 'Our Store';

    // Replace variables in subject and html
    let subject = template.subject;
    let html = template.html_content;

    const variables = {
      ...data,
      storeName
    };

    // Handle items array specially for order confirmation
    if (data.items && Array.isArray(data.items)) {
      const itemsHtml = data.items.map(item => `
<div style="display: flex; align-items: center; padding: 15px 0; border-bottom: 1px solid #f0f0f0;">
${item.image ? `<img src="${item.image}" alt="${item.name || 'Product'}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-right: 15px;" />` : ''}
<div>
<strong>${item.name || 'Product'}</strong><br/>
<span style="color: #666;">Qty: ${item.quantity || 1} x $${item.price || 0}</span>
</div>
</div>`).join('');
      
      html = html.replace(/{{#each items}}[\s\S]*?{{\/each}}/g, itemsHtml);
      html = html.replace(/{{items}}/g, itemsHtml);
    }

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value || '');
      html = html.replace(regex, value || '');
    });

    // Add unsubscribe link
    html = html.replace(/{{unsubscribeLink}}/g, `${process.env.VITE_APP_URL}/unsubscribe?email=${recipientEmail}&seller=${sellerId}`);

    console.log(`[AUTOMATION] Sending ${template.name} to ${recipientEmail}`);
    console.log(`[AUTOMATION] Subject: ${subject}`);
    
    try {
      if (transporter.sendMail) {
        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: recipientEmail,
          subject,
          html
        });
        console.log(`[AUTOMATION] Email sent successfully to ${recipientEmail}`);
      }
    } catch (emailErr) {
      console.error(`[AUTOMATION] Failed to send email to ${recipientEmail}:`, emailErr);
    }
    
    // Increment sent count
    if (settingsRes.rows.length > 0) {
      await db.query(
        'UPDATE email_marketing_settings SET sent_count = sent_count + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
        [settingsRes.rows[0].id]
      );
    }

  } catch (err) {
    console.error('Automation Error:', err);
  }
};