import React, { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
}

const SEO: React.FC<SEOProps> = ({ title, description, keywords, canonical }) => {
  useEffect(() => {
    document.title = `${title} | Iyonicorp`;
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', description);
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = description;
      document.head.appendChild(meta);
    }

    if (keywords) {
      const metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) {
        metaKeywords.setAttribute('content', keywords);
      } else {
        const meta = document.createElement('meta');
        meta.name = 'keywords';
        meta.content = keywords;
        document.head.appendChild(meta);
      }
    }

    if (canonical) {
      let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (linkCanonical) {
        linkCanonical.setAttribute('href', canonical);
      } else {
        linkCanonical = document.createElement('link');
        linkCanonical.rel = 'canonical';
        linkCanonical.href = canonical;
        document.head.appendChild(linkCanonical);
      }
    }
  }, [title, description, keywords, canonical]);

  return null;
};

export default SEO;