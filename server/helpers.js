export const toCamelObject = (obj) => {
  if (!obj) return obj;
  if (typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'theme' || key === 'stats' || key === 'subscription' || key === 'social_links' || key === 'contact_info' || key === 'delivery_locations' || key === 'payment_terms' || key === 'pricing_config' || key === 'payment_gateways' || key === 'auto_renew') {
      const camelKey = key === 'social_links' ? 'socialLinks'
        : key === 'contact_info' ? 'contactInfo'
        : key === 'delivery_locations' ? 'deliveryLocations'
        : key === 'payment_terms' ? 'paymentTerms'
        : key === 'pricing_config' ? 'pricingConfig'
        : key === 'payment_gateways' ? 'paymentGateways'
        : key === 'auto_renew' ? 'autoRenew'
        : key;
      result[camelKey] = value;
    } else {
      const camelKey = key.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace(/[-_]/g, ''));
      result[camelKey] = value;
    }
  }
  return result;
};

export const toCamelArray = (rows) => {
  if (!rows) return [];
  return rows.map(toCamelObject);
};

export async function getAuthenticatedSellerId(db, userId) {
  if (!userId) return null;
  const sellerRes = await db.query('SELECT id FROM sellers WHERE user_id = $1', [userId]);
  if (sellerRes.rows.length === 0) return null;
  return sellerRes.rows[0].id;
}
