import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, ShieldCheck } from 'lucide-react';
import { managerInvitationAPI } from '../../services/api';

export const AcceptManagerInvitation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('Preparing your invitation...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This invitation link is missing its invitation token.');
      return;
    }

    let isCurrent = true;
    managerInvitationAPI.get(token)
      .then((invitation) => {
        if (!isCurrent) return;
        setStatus('ready');
        setMessage(`Welcome, ${invitation.firstName || invitation.name || 'there'}! Your manager invitation is ready.`);
        window.setTimeout(() => {
          if (isCurrent) navigate(`/register?invitation=${encodeURIComponent(token)}`, { replace: true });
        }, 1600);
      })
      .catch((error) => {
        if (!isCurrent) return;
        setStatus('error');
        setMessage(error?.response?.data?.message || 'This invitation is invalid or has expired.');
      });

    return () => {
      isCurrent = false;
    };
  }, [navigate, token]);

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 text-white flex items-center justify-center">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/10 border border-white/15">
          {status === 'loading' && <Loader2 className="h-9 w-9 animate-spin text-cyan-300" />}
          {status === 'ready' && <CheckCircle className="h-10 w-10 text-emerald-300" />}
          {status === 'error' && <ShieldCheck className="h-10 w-10 text-rose-300" />}
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Iyonicorp partner network</p>
        <h1 className="text-4xl font-black tracking-tight">You have been invited.</h1>
        <p className="mx-auto mt-4 max-w-md text-slate-300">{message}</p>
        {status === 'ready' && <p className="mt-8 text-sm text-slate-400">Taking you to secure account setup...</p>}
        {status === 'error' && <button className="mt-8 rounded-xl bg-white px-5 py-3 font-semibold text-slate-900" onClick={() => navigate('/login')}>Go to sign in</button>}
      </div>
    </div>
  );
};
