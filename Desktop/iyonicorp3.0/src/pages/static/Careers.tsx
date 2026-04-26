import React from 'react';
import { Hexagon, MapPin, Clock, ArrowRight, ChevronRight } from 'lucide-react';
import SEO from '../../components/SEO';
import { Button } from '../../components/ui';

const jobOpenings = [
  { title: 'Senior Frontend Engineer', department: 'Engineering', location: 'Remote', type: 'Full-time' },
  { title: 'Backend Engineer', department: 'Engineering', location: 'Remote', type: 'Full-time' },
  { title: 'Product Designer', department: 'Design', location: 'Remote', type: 'Full-time' },
  { title: 'DevOps Engineer', department: 'Infrastructure', location: 'Remote', type: 'Full-time' },
  { title: 'Customer Success Manager', department: 'Support', location: 'Remote', type: 'Full-time' },
  { title: 'Technical Writer', department: 'Documentation', location: 'Remote', type: 'Contract' },
];

const Careers: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <SEO 
        title="Careers" 
        description="Join the Iyonicorp team and help build the future of modular commerce." 
      />
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <img src="/logo.png" alt="Iyonicorp Logo" className="w-10 h-10 object-contain" />
              </div>
              <a href="/" className="text-xl font-black tracking-tighter">IYONICORP</a>
            </div>
            <a href="/" className="text-sm font-bold text-gray-600 hover:text-gray-900">Back to Home</a>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-5xl lg:text-6xl font-black text-gray-900 mb-8">Careers at Iyonicorp</h1>
        
        <p className="text-xl text-gray-600 mb-12">
          Join our team and help build the future of commerce. We're looking for passionate 
          people who want to make a difference.
        </p>

        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Why Join Us?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Remote-First', desc: 'Work from anywhere' },
              { title: 'Competitive Pay', desc: 'Industry-leading salaries' },
              { title: 'Health Benefits', desc: 'Full medical & dental' }
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 p-6 rounded-2xl">
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Open Positions</h2>
          <div className="space-y-4">
            {jobOpenings.map((job, i) => (
              <div key={i} className="border border-gray-200 p-6 rounded-2xl hover:border-gray-400 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xl text-gray-900 mb-2">{job.title}</h3>
                    <div className="flex items-center space-x-4 text-gray-500">
                      <span>{job.department}</span>
                      <span>•</span>
                      <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" />{job.location}</span>
                      <span>•</span>
                      <span className="flex items-center"><Clock className="w-4 h-4 mr-1" />{job.type}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 bg-gray-900 text-white rounded-3xl p-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Don't see the right role?</h2>
          <p className="text-gray-400 mb-8">We're always looking for exceptional talent. Send us your resume.</p>
          <Button className="bg-white text-gray-900 hover:bg-gray-100 rounded-full px-8 py-4 font-bold">
            Email Us <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>

      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-400 text-sm">
          © 2026 Iyonicorp Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Careers;