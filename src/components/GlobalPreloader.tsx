import React from 'react';

interface GlobalPreloaderProps {
  message?: string;
}

const GlobalPreloader: React.FC<GlobalPreloaderProps> = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-white">
    <div className="relative mb-6">
      <div className="absolute inset-0 rounded-full bg-blue-100 opacity-75 animate-ping" style={{ width: '80px', height: '80px' }}></div>
      <img
        src="/logo.png"
        alt="Iyonicorp"
        className="relative w-20 h-20 object-contain rounded-2xl shadow-xl"
      />
    </div>
    <p className="text-gray-500 font-medium text-sm">{message}</p>
  </div>
);

export default GlobalPreloader;
