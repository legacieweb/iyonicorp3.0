import React, { useEffect, useState } from 'react';
import { getProjects } from '../utils/coolify';

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setError(null);
        const data = await getProjects();
        setProjects(data);
      } catch (error: any) {
        console.error('Failed to load projects:', error);
        if (error?.response?.status === 401) {
          setError('Invalid or expired API token. Please check your VITE_COOLIFY_API_TOKEN in .env file.');
        } else if (!import.meta.env.VITE_COOLIFY_API_TOKEN) {
          setError('API token not configured. Please create a .env file with VITE_COOLIFY_API_TOKEN.');
        } else {
          setError('Failed to load projects. Please check your connection and try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  if (error) {
    return (
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">Iyonicorp Admin Dashboard</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Configuration Error</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="bg-white p-4 rounded border border-red-100">
            <p className="text-sm text-gray-600 mb-2">To fix this:</p>
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
              <li>Create a <code className="bg-gray-100 px-1 rounded">.env</code> file in the project root</li>
              <li>Add: <code className="bg-gray-100 px-1 rounded">VITE_COOLIFY_API_TOKEN=your_token_here</code></li>
              <li>Get your token from <a href="http://localhost:8000/settings" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Coolify Settings</a></li>
              <li>Restart the development server</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-12 h-12 flex items-center justify-center">
          <img src="/logo.png" alt="Iyonicorp Logo" className="w-10 h-10 object-contain" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800">Iyonicorp Admin Dashboard</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Coolify Projects</h3>
          {projects.length > 0 ? (
            <ul className="space-y-3">
              {projects.map((project: any) => (
                <li key={project.id} className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                  <span className="font-medium">{project.name}</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full uppercase font-bold">
                    {project.status || 'Active'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No projects found. Check your API token or connection.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Tenants</span>
              <span className="font-bold">12</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Monthly Revenue</span>
              <span className="font-bold text-green-600">$12,450</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
