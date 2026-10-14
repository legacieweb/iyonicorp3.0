import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  BarChart3,
  Send,
  Settings,
  Code,
  Rocket,
  Globe,
  Zap,
  ArrowRight,
  ExternalLink,
  Users,
  CheckCircle
} from 'lucide-react';
import SEO from '../components/SEO';
import { HomepageFooter } from '../components/HomepageFooter';
import './iyonic-mailer-landing.css';

interface IyonicMailerProps {
  onGetStarted?: (role: 'seller' | 'seller_manager') => void;
}

export const IyonicMailer: React.FC<IyonicMailerProps> = ({ onGetStarted }) => {
  const navigate = useNavigate();

   const handleGetStarted = () => {
     navigate('/iyonic-mailer/register');
   };

   const handleSignIn = () => {
     navigate('/iyonic-mailer/login');
   };



  const features = [
    {
      icon: Send,
      title: 'Campaign Management',
      description: 'Create and send campaigns, then review the delivery and engagement activity available in your workspace.',
      color: 'text-blue-600',
      bg: 'bg-blue-100'
    },
    {
      icon: Settings,
      title: 'SMTP & Provider Integration',
      description: 'Configure a supported SMTP or email service provider with the credentials available to your account.',
      color: 'text-emerald-600',
      bg: 'bg-emerald-100'
    },
    {
      icon: Code,
      title: 'API & Webhooks',
      description: 'Use the mailer tools available in your workspace to prepare and manage campaign activity.',
      color: 'text-purple-600',
      bg: 'bg-purple-100'
    },
    {
      icon: BarChart3,
      title: 'Analytics & Reporting',
      description: 'Review campaign performance and engagement data provided by your account.',
      color: 'text-indigo-600',
      bg: 'bg-indigo-100'
    },
    {
      icon: Users,
      title: 'Customer Segmentation',
      description: 'Organize subscribers and choose campaign audiences from the contacts available to your workspace.',
      color: 'text-pink-600',
      bg: 'bg-pink-100'
    }
  ];

  const providers = [
    { name: 'SMTP', description: 'Your own mail server' },
    { name: 'SendGrid', description: 'Cloud email API' },
    { name: 'Mailgun', description: 'API-first email platform' },
    { name: 'AWS SES', description: 'Amazon Simple Email Service' },
    { name: 'Sendinblue', description: 'Email & marketing automation' },
    { name: 'Postmark', description: 'Transactional email' }
  ];

  return (
    <>
      <SEO
        title="IyonicMailer — Campaign Workspace | Iyonicorp"
        description="Prepare email campaigns, manage subscribers, configure a supported sending provider and review available campaign activity with IyonicMailer."
      />

      <div className="mailer-landing">
        <header className="mailer-header">
          <a className="mailer-brand" href="#top" aria-label="IyonicMailer home"><span className="mailer-brand-icon"><Mail size={19} /></span><span>Iyonic<span>Mailer</span></span></a>
          <nav aria-label="IyonicMailer navigation"><a href="#workflow">How it works</a><a href="#capabilities">Capabilities</a><a href="#providers">Sending setup</a></nav>
          <div className="mailer-header-actions"><button className="mailer-signin" onClick={handleSignIn}>Sign in</button><button className="mailer-button mailer-button-dark" onClick={handleGetStarted}>Create account <ArrowRight size={16} /></button></div>
        </header>

        {/* Hero Section */}
        <main id="top">
          <section className="mailer-hero">
            <div className="mailer-hero-copy"><p className="mailer-kicker"><span /> EMAIL, WITH YOUR BUSINESS IN MIND</p><h1>Make every<br /><em>send mean something.</em></h1><p className="mailer-lede">Plan campaigns, manage your audience and see how messages perform. Bring your own email provider and keep the sending setup in your hands.</p><div className="mailer-hero-actions"><button className="mailer-button mailer-button-lime" onClick={handleGetStarted}>Set up IyonicMailer <ArrowRight size={17} /></button><button className="mailer-text-button" onClick={handleSignIn}>Already have an account? Sign in</button></div><div className="mailer-proofline"><span><CheckCircle size={15} /> Campaign tools</span><span><CheckCircle size={15} /> Provider choice</span><span><CheckCircle size={15} /> Performance reporting</span></div></div>
            <div className="mailer-compose" aria-label="Illustration of an email campaign workflow"><div className="compose-top"><span className="compose-dot" /><span>CAMPAIGN WORKSPACE</span><span className="compose-status">DRAFT</span></div><div className="compose-body"><aside><b>IM</b><span>Overview</span><span className="compose-active">Campaigns</span><span>Audience</span><span>Settings</span></aside><div className="compose-editor"><p className="compose-label">NEW CAMPAIGN <span>·</span> EMAIL</p><h2>A note worth opening.</h2><p className="compose-subtitle">A considered update for the people who chose to hear from you.</p><div className="compose-image"><div className="compose-sun" /><div className="compose-horizon" /><span>YOUR NEXT<br />GOOD IDEA</span></div><div className="compose-fields"><span>Subject line <b>A little news from us</b></span><span>Audience <b>Choose a segment</b></span></div><div className="compose-send"><span><i /> Ready when you are</span><span>Review campaign <ArrowRight size={14} /></span></div></div></div></div>
          </section>

        <section id="capabilities" className="mailer-section mailer-capabilities" aria-labelledby="mailer-capabilities-title">
          <div className="mailer-section-heading"><p className="mailer-kicker"><span /> THE CAMPAIGN TOOLKIT</p><h2 id="mailer-capabilities-title">Everything around<br /><em>the send.</em></h2><p>One workspace for preparing campaigns, organizing subscribers and learning from delivery activity.</p></div>
          <div className="mailer-feature-list">{features.map((feature, index) => { const Icon = feature.icon; return <article className="mailer-feature" key={feature.title}><span className="mailer-feature-index">0{index + 1}</span><span className="mailer-feature-icon"><Icon size={20} /></span><div><h3>{feature.title}</h3><p>{feature.description}</p></div><ArrowRight size={18} /></article>; })}</div>
        </section>
        <section id="providers" className="mailer-section mailer-providers"><div><p className="mailer-kicker"><span /> SENDING CONFIGURATION</p><h2>Choose the route<br /><em>your setup needs.</em></h2><p>Configure a supported email provider in your account. Availability depends on your provider credentials and workspace configuration.</p></div><div className="provider-grid">{providers.map((provider, index) => <div className="provider-item" key={provider.name}><span>0{index + 1}</span><strong>{provider.name}</strong><small>{provider.description}</small></div>)}</div></section>
        <section id="workflow" className="mailer-section mailer-workflow"><div className="mailer-section-heading"><p className="mailer-kicker"><span /> A SIMPLE CAMPAIGN RHYTHM</p><h2>From first draft<br /><em>to a clearer picture.</em></h2></div><div className="workflow-steps"><article><b>01</b><Mail /><h3>Prepare the message</h3><p>Build a campaign and choose who should receive it.</p></article><article><b>02</b><Send /><h3>Choose how it sends</h3><p>Configure an available provider for your account.</p></article><article><b>03</b><BarChart3 /><h3>Review the response</h3><p>Use available reports to understand campaign delivery and engagement.</p></article></div></section>
        <section id="pricing" className="mailer-section mailer-pricing"><div className="mailer-pricing-note"><p className="mailer-kicker"><span /> GET STARTED</p><h2>Your setup.<br /><em>Your sending choice.</em></h2><p>Plans and sending limits depend on the options available to your account. Create an account to review current choices.</p><button className="mailer-button mailer-button-dark" onClick={handleGetStarted}>View account options <ArrowRight size={16} /></button></div><div className="mailer-pricing-panel"><Rocket size={23} /><p>Start with the essentials</p><ul><li><CheckCircle /> Set up a campaign workspace</li><li><CheckCircle /> Connect a supported sending provider</li><li><CheckCircle /> Manage campaigns and review activity</li></ul><button className="mailer-outline-button" onClick={handleSignIn}>Sign in to your workspace</button></div></section>
        <section className="mailer-closing"><div><p className="mailer-kicker"><span /> IYONICORP BUSINESS TOOLS</p><h2>Good email starts<br />with a clear <em>next step.</em></h2><p>Bring your audience, message and sending setup into one campaign workspace.</p><button className="mailer-button mailer-button-lime" onClick={handleGetStarted}>Create your account <ArrowRight size={17} /></button><button className="mailer-closing-login" onClick={handleSignIn}>Sign in</button></div><div className="mailer-closing-mark" aria-hidden="true"><Mail size={76} /><span>YOUR<br />VOICE,<br /><i>DELIVERED.</i></span></div></section>
        <HomepageFooter showAboutCta={false} />
      </main>
      </div>
    </>
  );
};
