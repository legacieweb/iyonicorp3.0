# Marketing Features - Quick Reference

## Getting Started

### 1. Email Configuration (Required First Step)
Navigate to **Marketing → Email Settings**
- Choose provider (SMTP, SendGrid, Mailgun, Amazon SES, Brevo, Postmark)
- Enter credentials
- Set from-name and from-email
- Click "Save Settings"
- Optional: Click "Send Test Email" to verify

### 2. Connect Social Media
Navigate to **Marketing → Social Media**
- Click "Connect Account" for any platform
- Enter username/profile URL
- Click Connect (OAuth will be implemented in production)
- Repeat for all desired platforms

### 3. Create Email Template (Optional)
Navigate to **Marketing → Templates**
- Click "Load Defaults" to get pre-built templates
- Or create custom templates with HTML
- Use variables like `{{customerName}}`, `{{storeName}}`, `{{unsubscribeLink}}`
- Preview before saving

### 4. Create Campaign
Navigate to **Marketing → Campaigns**
- Click "Create Campaign"
- Enter name and subject
- Write HTML content or select a template
- Choose recipients (all customers / segment / custom)
- Send immediately or schedule

## Tab Overview

| Tab | Purpose |
|-----|---------|
| Overview | High-level stats and quick actions |
| Social Media | Connect social accounts, share content |
| Email Settings | Configure SMTP/API credentials |
| Campaigns | Create, send, track email campaigns |
| Templates | Manage reusable email templates |

## Key Features

### Social Media
- **Platforms**: Facebook, Instagram, X/Twitter, LinkedIn, YouTube, TikTok
- **Actions**: Connect, Disconnect, Share Post, Refresh Stats
- **Metrics**: Follower count, connection status, last synced

### Email Marketing
- **Providers**: SMTP, SendGrid, Mailgun, Amazon SES, Brevo, Postmark
- **Campaign Types**: Transactional, Promotional, Newsletter, Abandoned Cart
- **Targeting**: All customers, filtered segments, custom lists
- **Scheduling**: Immediate or scheduled delivery
- **Analytics**: Delivered, opened, clicked, bounced, unsubscribed

### Templates
- **Default Templates**: 5 pre-built (order confirm, shipping, welcome, abandoned cart, promo)
- **Variables**: `{{customerName}}`, `{{storeName}}`, `{{orderId}}`, `{{total}}`, etc.
- **Categories**: Transactional, Promotional, Notification, Welcome, Abandoned Cart, Custom
- **Preview**: Live HTML preview before saving

## Technical Notes

### Frontend Paths
- All components: `src/components/marketing/`
- Dashboard tab: `src/pages/seller/SellerDashboard.tsx` (line ~958)
- Context: `src/context/DataContext.tsx`
- API: `src/services/api.ts`

### State Management
All marketing state lives in DataContext:
- `socialMediaAccounts` - array of connected accounts
- `emailSettings` - current email provider config
- `emailCampaigns` - all campaigns
- `emailTemplates` - all templates

### API Endpoints (Backend)
```
GET    /social-media/seller/:sellerId
POST   /social-media/connect
DELETE /social-media/:id
POST   /social-media/:id/share

GET    /email-marketing/settings/seller/:sellerId
POST   /email-marketing/settings
PATCH  /email-marketing/settings/:id
POST   /email-marketing/test
POST   /email-marketing/settings/:id/verify

GET    /email-marketing/campaigns/seller/:sellerId
POST   /email-marketing/campaigns
PATCH  /email-marketing/campaigns/:id
DELETE /email-marketing/campaigns/:id
POST   /email-marketing/campaigns/:id/send
POST   /email-marketing/campaigns/:id/schedule
GET    /email-marketing/campaigns/:id/stats

GET    /email-marketing/templates/seller/:sellerId
POST   /email-marketing/templates
PATCH  /email-marketing/templates/:id
DELETE /email-marketing/templates/:id
GET    /email-marketing/templates/defaults
```

## Default Email Template Variables

| Variable | Description |
|----------|-------------|
| `{{customerName}}` | Customer's full name |
| `{{storeName}}` | Your store name |
| `{{orderId}}` | Order identifier |
| `{{total}}` | Order total amount |
| `{{shippingAddress}}` | Full shipping address |
| `{{carrier}}` | Shipping carrier name |
| `{{trackingNumber}}` | Package tracking number |
| `{{trackingUrl}}` | Tracking link URL |
| `{{estimatedDelivery}}` | Expected delivery date |
| `{{discountCode}}` | Promo code |
| `{{discountValue}}` | Discount percentage |
| `{{cartItems}}` | Items in abandoned cart |
| `{{cartTotal}}` | Cart total |
| `{{cartUrl}}` | Link to cart |
| `{{promoCode}}` | Promotional code |
| `{{discountPercent}}` | Discount percentage |
| `{{storeUrl}}` | Store homepage URL |
| `{{unsubscribeLink}}` | Email unsubscribe link |
| `{{featuredProducts}}` | HTML for featured products |

## Order of Operations

1. **First Time Setup**:
   - Email Settings → Configure provider
   - Social Media → Connect accounts
   - Templates → Load defaults (optional)

2. **Regular Operations**:
   - Create campaign → Select template → Set recipients → Send/Schedule
   - Share to social media from Social Media tab
   - Monitor campaign stats in Campaigns table

3. **Maintenance**:
   - Update email settings if provider changes
   - Refresh social media connections periodically
   - Archive old templates
   - Review campaign analytics

## Error Handling

All components include:
- Empty states with CTAs
- Success/error toasts (via alerts currently)
- Confirmation dialogs for destructive actions
- Disabled states during loading
- Fallback values for missing data

## Future Enhancements

- OAuth flow for social media connections
- Visual email builder (WYSIWYG)
- A/B testing for campaigns
- Automated drip campaigns
- Customer segmentation with advanced filters
- Social media post scheduling
- Cross-posting to multiple platforms
- Email template marketplace
- Detailed deliverability reports
- Bounce handling and suppression lists
