import React from 'react';

interface ThemeMediaProps extends React.HTMLAttributes<HTMLElement> {
  src?: string;
  alt?: string;
  className?: string;
}

const ThemeMedia: React.FC<ThemeMediaProps> = ({ src, alt = '', className, ...props }) => {
  if (!src) return null;
  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(src)) {
    return <video src={src} autoPlay muted loop playsInline controls={false} className={className} {...props} />;
  }
  return <img src={src} alt={alt} className={className} {...props} />;
};

export default ThemeMedia;