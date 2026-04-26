import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Card, CardHeader, Button, Badge, Popup, ConfirmPopup, Input } from '../ui';
import { useToast } from '../../context/ToastContext';
import type { SocialMediaAccount } from '../../services/api';
import {
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Music2,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Link2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Share2
} from 'lucide-react';

const platformConfig = {
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: 'bg-blue-600',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    placeholder: 'yourpage',
    urlTemplate: (username: string) => `https://facebook.com/${username}`
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: 'bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400',
    lightColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    borderColor: 'border-purple-200',
    placeholder: 'yourusername',
    urlTemplate: (username: string) => `https://instagram.com/${username}`
  },
  twitter: {
    name: 'X (Twitter)',
    icon: Twitter,
    color: 'bg-black',
    lightColor: 'bg-gray-50',
    textColor: 'text-gray-900',
    borderColor: 'border-gray-200',
    placeholder: 'yourhandle',
    urlTemplate: (username: string) => `https://x.com/${username}`
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: 'bg-blue-700',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    placeholder: 'yourcompany',
    urlTemplate: (username: string) => `https://linkedin.com/company/${username}`
  },
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: 'bg-red-600',
    lightColor: 'bg-red-50',
    textColor: 'text-red-600',
    borderColor: 'border-red-200',
    placeholder: 'yourchannel',
    urlTemplate: (username: string) => `https://youtube.com/@${username}`
  },
  tiktok: {
    name: 'TikTok',
    icon: Music2,
    color: 'bg-black',
    lightColor: 'bg-gray-50',
    textColor: 'text-gray-900',
    borderColor: 'border-gray-200',
    placeholder: '@yourusername',
    urlTemplate: (username: string) => `https://tiktok.com/@${username.replace('@', '')}`
  }
};

export const SocialMediaManager: React.FC = () => {
  const { socialMediaAccounts, connectSocialMedia, disconnectSocialMedia, shareToSocialMedia } = useData();
  const { showToast } = useToast();
  const [isConnectPopupOpen, setIsConnectPopupOpen] = useState(false);
  const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);
  const [isDisconnectConfirmOpen, setIsDisconnectConfirmOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<typeof socialMediaAccounts[0] | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<keyof typeof platformConfig>('facebook');
  const [shareContent, setShareContent] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [shareImage, setShareImage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareResult, setShareResult] = useState<{ success: boolean; postUrl?: string } | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlatform) return;

    setIsConnecting(true);
    try {
      // In production, this would involve OAuth flow
      // For now, we'll simulate connection with mock access token
      const mockAccessToken = 'mock_token_' + Date.now();
      await connectSocialMedia(
        selectedPlatform,
        mockAccessToken,
        (document.getElementById('social-username') as HTMLInputElement)?.value || `${selectedPlatform}_user`,
        (document.getElementById('social-profile') as HTMLInputElement)?.value || platformConfig[selectedPlatform].urlTemplate('user')
      );
      setIsConnectPopupOpen(false);
      showToast('Account connected successfully!', 'success');
    } catch (error) {
      console.error('Failed to connect social account:', error);
      showToast('Failed to connect account. Please try again.', 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    setIsSharing(true);
    setShareResult(null);
    try {
      const result = await shareToSocialMedia(
        selectedAccount.id,
        shareContent,
        shareImage || undefined,
        shareLink
      );
      setShareResult(result);
      if (result.success) {
        setTimeout(() => {
          setIsSharePopupOpen(false);
          setShareContent('');
          setShareLink('');
          setShareImage('');
          setShareResult(null);
          setSelectedAccount(null);
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to share:', error);
      setShareResult({ success: false });
    } finally {
      setIsSharing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!selectedAccount) return;
    try {
      await disconnectSocialMedia(selectedAccount.id);
      showToast('Account disconnected successfully', 'success');
      setIsDisconnectConfirmOpen(false);
    } catch (error) {
      showToast('Failed to disconnect account', 'error');
    }
  };

  const formatFollowers = (count: number): string => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Social Media</h2>
          <p className="text-gray-500 font-medium">Connect and manage your social media accounts</p>
        </div>
        <Button onClick={() => setIsConnectPopupOpen(true)} className="bg-blue-600 hover:bg-blue-700 font-bold px-6 py-3 rounded-xl shadow-lg shadow-blue-200 transition-all">
          <Plus className="w-5 h-5 mr-2" />
          Connect Account
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(platformConfig).map(([platformKey, config]) => {
          const Icon = config.icon;
          const account = socialMediaAccounts.find(acc => acc.platform === platformKey);
          const isConnected = !!account;

          return (
            <Card key={platformKey} className={`relative overflow-hidden ${isConnected ? 'border-2 ' + config.borderColor : ''}`}>
              <div className={`absolute top-0 right-0 w-24 h-24 ${config.lightColor} -mr-8 -mt-8 rounded-full blur-2xl opacity-50`} />

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 ${config.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  {isConnected ? (
                    <Badge variant="success" className="font-bold">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="default" className="font-bold">
                      <XCircle className="w-3 h-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                </div>

                <h3 className="text-xl font-black text-gray-900 mb-1">{config.name}</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {isConnected
                    ? `@${account.username} • ${formatFollowers(account.followers)} followers`
                    : `Connect your ${config.name} account to share products and updates automatically.`
                  }
                </p>

                {isConnected && account && (
                  <div className="space-y-2 mb-4">
                    <a
                      href={account.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Profile
                    </a>
                    <p className="text-xs text-gray-400">
                      Last synced: {account.lastSynced ? new Date(account.lastSynced).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  {isConnected ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedAccount(account);
                          setIsSharePopupOpen(true);
                        }}
                        className="flex-1"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedAccount(account);
                          setIsDisconnectConfirmOpen(true);
                        }}
                        className="text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedPlatform(platformKey as any);
                        setIsConnectPopupOpen(true);
                      }}
                      className="w-full"
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Connect Popup */}
      <Popup isOpen={isConnectPopupOpen} onClose={() => setIsConnectPopupOpen(false)} title={`Connect ${platformConfig[selectedPlatform]?.name || 'Account'}`} size="full">
        <form onSubmit={handleConnect} className="space-y-6 py-4">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-16 h-16 ${platformConfig[selectedPlatform]?.color || 'bg-gray-200'} rounded-2xl flex items-center justify-center`}>
              {React.createElement(platformConfig[selectedPlatform]?.icon || AlertCircle, { className: "w-8 h-8 text-white" })}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{platformConfig[selectedPlatform]?.name}</h3>
              <p className="text-sm text-gray-500">Enter your {platformConfig[selectedPlatform]?.name} profile details to connect.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Username / Page Name</label>
              <Input
                id="social-username"
                placeholder={platformConfig[selectedPlatform]?.placeholder}
                className="font-medium"
                prefix={<Users className="w-5 h-5 text-gray-400" />}
              />
              <p className="text-xs text-gray-400 mt-1">Your public {platformConfig[selectedPlatform]?.name} username or page name</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Profile URL</label>
              <Input
                id="social-profile"
                placeholder={platformConfig[selectedPlatform]?.urlTemplate('yourusername')}
                className="font-mono text-sm"
                prefix={<ExternalLink className="w-5 h-5 text-gray-400" />}
              />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-bold mb-1">OAuth Authentication</p>
                  <p className="text-blue-600">
                    In production, this would open an OAuth flow to securely connect your {platformConfig[selectedPlatform]?.name} account.
                    For demo purposes, just click Connect.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => setIsConnectPopupOpen(false)} disabled={isConnecting}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isConnecting}>
              {isConnecting ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Link2 className="w-5 h-5 mr-2" />}
              {isConnecting ? 'Connecting...' : 'Connect Account'}
            </Button>
          </div>
        </form>
      </Popup>

      {/* Share Popup */}
      <Popup isOpen={isSharePopupOpen} onClose={() => {
        setIsSharePopupOpen(false);
        setShareResult(null);
        setSelectedAccount(null);
      }} title="Share to Social Media" size="full">
        <form onSubmit={handleShare} className="space-y-6 py-4">
          {selectedAccount && (
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${platformConfig[selectedAccount.platform]?.color}`}>
                {React.createElement(platformConfig[selectedAccount.platform]?.icon || AlertCircle, { className: "w-5 h-5 text-white" })}
              </div>
              <div>
                <p className="font-bold text-gray-900">{platformConfig[selectedAccount.platform]?.name}</p>
                <p className="text-sm text-gray-500">@{selectedAccount.username}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Message</label>
              <textarea
                value={shareContent}
                onChange={(e) => setShareContent(e.target.value)}
                placeholder="What would you like to share with your audience?"
                className="w-full p-3 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={4}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Link URL</label>
              <Input
                type="url"
                value={shareLink}
                onChange={(e) => setShareLink(e.target.value)}
                placeholder="https://yourstore.com/product/123"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Image URL (optional)</label>
              <Input
                type="url"
                value={shareImage}
                onChange={(e) => setShareImage(e.target.value)}
                placeholder="https://yourstore.com/image.jpg"
              />
            </div>
          </div>

          {shareResult && (
            <div className={`p-4 rounded-xl ${shareResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-2">
                {shareResult.success ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-bold text-green-700">Shared successfully!</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <p className="text-sm font-bold text-red-700">Failed to share. Please try again.</p>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="ghost" onClick={() => {
              setIsSharePopupOpen(false);
              setShareResult(null);
            }} disabled={isSharing}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSharing || !shareContent || !shareLink}>
              {isSharing ? <RefreshCw className="w-5 h-5 animate-spin mr-2" /> : <Share2 className="w-5 h-5 mr-2" />}
              {isSharing ? 'Sharing...' : 'Share Now'}
            </Button>
          </div>
        </form>
      </Popup>

      <ConfirmPopup
        isOpen={isDisconnectConfirmOpen}
        onClose={() => setIsDisconnectConfirmOpen(false)}
        onConfirm={handleDisconnect}
        title="Disconnect Account"
        message={`Are you sure you want to disconnect your ${selectedAccount ? platformConfig[selectedAccount.platform].name : ''} account? You will no longer be able to share updates automatically.`}
        confirmText="Disconnect"
        type="danger"
      />
    </div>
  );
};
