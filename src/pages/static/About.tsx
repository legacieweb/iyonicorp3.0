import React from 'react';
import { Hexagon, ArrowRight } from 'lucide-react';
import SEO from '../../components/SEO';
import { Button } from '../../components/ui';

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <SEO 
        title="About Us" 
        description="Learn about Iyonicorp's mission to empower businesses with modular, scalable commerce solutions." 
      />
      {/* Header */}
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="w-10 h-10 flex items-center justify-center">
                <img src="/logo.png" alt="Iyonicorp Logo" className="w-10 h-10 object-contain" />
              </div>
              <a href="/" className="text-xl font-black tracking-tighter">IYONICORP</a>
            </div>
            <a href="/" className="text-sm font-bold text-gray-600 hover:text-gray-900">
              Back to Home
            </a>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-5xl lg:text-6xl font-black text-gray-900 mb-8">About Iyonicorp</h1>
        
        <div className="prose prose-lg max-w-none">
          <p className="text-xl text-gray-600 mb-8">
            Iyonicorp is the next-generation modular commerce platform, empowering businesses 
            to build, sell, and scale with three powerful products: IyonicShop, IyonicPay, and IyonicBots.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Our Mission</h2>
          <p className="text-gray-600 mb-6">
            We're on a mission to make commerce accessible to everyone. Whether you're a small 
            business owner or a large enterprise, Iyonicorp provides the tools you need 
            to succeed in the global digital economy.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Our Story</h2>
          <p className="text-gray-600 mb-6">
            Founded in 2024, Iyonicorp was built from the ground up to solve the challenges 
            of modern e-commerce. We believe in modular, scalable solutions that grow 
            with your business.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Our Values</h2>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            <li><strong>Simplicity</strong> - Commerce should be easy</li>
            <li><strong>Innovation</strong> - Always pushing boundaries</li>
            <li><strong>Trust</strong> - Security and reliability first</li>
            <li><strong>Growth</strong> - Your success is our success</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">Join Our Journey</h2>
          <p className="text-gray-600 mb-6">
            Ready to build your empire? Start selling today with Iyonicorp.
          </p>
          
          <Button className="bg-gray-900 text-white hover:bg-black rounded-full px-8 py-4 font-bold">
            Get Started <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-400 text-sm">
          © 2026 Iyonicorp Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default About;