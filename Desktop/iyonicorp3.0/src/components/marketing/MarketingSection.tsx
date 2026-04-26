import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Card, CardHeader, Badge } from '../ui';
import { SocialMediaManager } from './SocialMediaManager';
import { EmailSettingsManager } from './EmailSettingsManager';
import { EmailCampaignManager } from './EmailCampaignManager';
import { EmailTemplateEditor } from './EmailTemplateEditor';
import {
  Share2,
  Mail,
  FileText,
  Settings,
  BarChart3,
  Clock,
  RefreshCw
} from 'lucide-react';

type MarketingTab = 'overview' | 'social' | 'email-settings' | 'campaigns' | 'templates';

export const MarketingSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MarketingTab>('overview');
  const { socialMediaAccounts, emailCampaigns, emailSettings, emailTemplates, sellers, getMarketingStats, marketingStats, refreshData } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sellerId = sellers[0]?.id;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview' && sellerId) {
      const interval = setInterval(refreshData, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [activeTab, sellerId, refreshData]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'social', label: 'Social Media', icon: Share2 },
    { id: 'email-settings', label: 'Email Settings', icon: Settings },
    { id: 'campaigns', label: 'Campaigns', icon: Mail },
    { id: 'templates', label: 'Templates', icon: FileText }
  ];

  const connectedAccounts = socialMediaAccounts.filter(acc => acc.isConnected).length;
  const activeCampaigns = emailCampaigns.filter(c => c.status === 'sent' || c.status === 'scheduled').length;
  const emailConfigured = emailSettings?.isActive && emailSettings?.isVerified;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Marketing</h2>
          <p className="text-gray-500">Grow your audience with social media and email marketing</p>
        </div>
        {activeTab === 'overview' && (
          <button 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Overview Dashboard */}
      {activeTab === 'overview' && (
        <div className="space-y-6 fade-in">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-sm text-blue-100 mb-1">Connected Accounts</p>
              <p className="text-2xl font-black">{marketingStats?.socialAccounts ?? connectedAccounts}/6</p>
              <p className="text-xs text-blue-100 mt-2">
                {6 - (marketingStats?.socialAccounts ?? connectedAccounts)} more available
              </p>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-none hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-sm text-purple-100 mb-1">Scheduled Posts</p>
              <p className="text-2xl font-black">{marketingStats?.scheduledPosts ?? 0}</p>
              <p className="text-xs text-purple-100 mt-2">
                Ready for automated posting
              </p>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-sm text-emerald-100 mb-1">Emails Sent</p>
              <p className="text-2xl font-black">{marketingStats?.emailSettings?.sentCount ?? 0}</p>
              <p className="text-xs text-emerald-100 mt-2">
                Across all campaigns
              </p>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-amber-600 text-white border-none hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-sm text-orange-100 mb-1">Active Campaigns</p>
              <p className="text-2xl font-black">
                {(marketingStats?.campaigns?.sent || 0) + (marketingStats?.campaigns?.scheduled || 0) || activeCampaigns}
              </p>
              <p className="text-xs text-orange-100 mt-2">
                {marketingStats?.campaigns?.scheduled ?? 0} scheduled next
              </p>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader title="Quick Actions" subtitle="Get started with marketing" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {tabs.filter(t => t.id !== 'overview').map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as MarketingTab)}
                    className="p-6 bg-gray-50 hover:bg-blue-50 rounded-2xl border-2 border-transparent hover:border-blue-200 transition-all group"
                  >
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm group-hover:shadow-md flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-gray-600 group-hover:text-blue-600" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 text-center group-hover:text-blue-700">
                      {tab.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader
              title="Recent Campaigns"
              subtitle="Latest email campaigns"
              action={
                <button
                  onClick={() => setActiveTab('campaigns')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View All
                </button>
              }
            />
            {emailCampaigns.length === 0 ? (
              <div className="p-8 text-center">
                <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No campaigns yet. Create your first campaign to start engaging customers.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {emailCampaigns.slice(0, 5).map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-bold text-gray-900">{campaign.name}</p>
                      <p className="text-sm text-gray-500">{campaign.subject}</p>
                    </div>
                    <Badge variant={
                      campaign.status === 'sent' ? 'success' :
                      campaign.status === 'scheduled' ? 'warning' :
                      campaign.status === 'draft' ? 'default' : 'danger'
                    }>
                      {campaign.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Social Media Tab */}
      {activeTab === 'social' && <SocialMediaManager />}

      {/* Email Settings Tab */}
      {activeTab === 'email-settings' && <EmailSettingsManager />}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && <EmailCampaignManager />}

      {/* Templates Tab */}
      {activeTab === 'templates' && <EmailTemplateEditor />}

      {/* Subtabs navigation */}
      <div className="flex gap-2 border-b border-gray-200 pb-4 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as MarketingTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
