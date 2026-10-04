import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock3, Download, LogOut, MessageCircle, ShoppingBag, Star, Wallet } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { Order, ordersAPI, Seller, sellersAPI, uploadAPI } from '../../../../services/api';
import { formatPrice } from '../../../../utils/currency';
import { getHomeworkerSettings, HomeworkerMessage, isHomeworker, readHomeworkerOrder } from './homeworkerTypes';
import HomeworkerChat from './HomeworkerChat';
import './homeworker.css';

interface ChatMessage {
  id: string;
  sender: 'student' | 'worker';
  text: string;
  timestamp: string;
}

const HomeworkerStudent: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<Seller | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError('');
      try {
        const [allOrders, allSellers] = await Promise.all([ordersAPI.getAll(), sellersAPI.getAll()]);
        const homeworkerOrders = allOrders.filter((order) => readHomeworkerOrder(order) && order.customerEmail === user?.email);
        const homeworkerSeller = allSellers.find((s) => isHomeworker(s));
        if (!active) return;
        setOrders(homeworkerOrders);
        setSeller(homeworkerSeller || null);
      } catch {
        if (active) setError('Could not load your assignments. Please refresh and try again.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [user?.email]);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'processing': return 'status-processing';
      case 'shipped': return 'status-shipped';
      case 'delivered': return 'status-delivered';
      default: return 'status-other';
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'Awaiting worker';
      case 'processing': return 'In progress';
      case 'shipped': return 'Ready for review';
      case 'delivered': return 'Completed';
      default: return status;
    }
  };

  const handleChat = (order: Order) => {
    setSelectedOrder(order);
    const hwData = readHomeworkerOrder(order);
    const savedMessages: ChatMessage[] = (hwData?.messages || []).map((m: HomeworkerMessage) => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      timestamp: m.timestamp,
    }));
    setMessages(savedMessages);
    setMessageDraft('');
  };

  const sendMessage = (event: React.FormEvent) => {
    event.preventDefault();
    if (!messageDraft.trim() || !selectedOrder || !seller) return;
    const newMessage: ChatMessage = {
      id: `sent-${Date.now()}`,
      sender: 'student',
      text: messageDraft.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((current) => [...current, newMessage]);
    setMessageDraft('');

    const hwData = readHomeworkerOrder(selectedOrder);
    if (hwData) {
      const updatedMessages = [...(hwData.messages || []), { ...newMessage, id: newMessage.id } as HomeworkerMessage];
      ordersAPI.update(selectedOrder.id, {
        deliveryLocation: JSON.stringify({ ...hwData, messages: updatedMessages }),
      }).catch(() => {});
    }
  };

  const payBalance = async (order: Order) => {
    const balance = order.remainingBalance || 0;
    if (balance <= 0) return;
    try {
      await ordersAPI.update(order.id, {
        amountPaid: (order.amountPaid || 0) + balance,
        remainingBalance: 0,
        status: 'delivered',
      });
      setOrders((list) => list.map((item) =>
        item.id === order.id
          ? { ...item, amountPaid: (item.amountPaid || 0) + balance, remainingBalance: 0, status: 'delivered' }
          : item
      ));
      setNotice('Balance paid. You can now download the assignment.');
      if (selectedOrder?.id === order.id) {
        setSelectedOrder({ ...order, amountPaid: (order.amountPaid || 0) + balance, remainingBalance: 0, status: 'delivered' });
      }
    } catch {
      setError('Could not process payment. Please try again.');
    }
  };

  const downloadFile = (url: string) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="homeworker-student-shell">
        <div className="homeworker-student-loading"><div className="loading-spinner" /><p>Loading your assignments…</p></div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="homeworker-student-shell">
        <div className="homeworker-student-loading" role="alert">{error || 'No Homeworker service found.'}</div>
      </div>
    );
  }

  const settings = getHomeworkerSettings(seller);

  return (
    <div className="homeworker-student-shell">
      <aside className="homeworker-student-sidebar">
        <div className="homeworker-student-brand"><span className="wordmark-mark"><ShoppingBag size={18} /></span><b>Homeworker</b><small>STUDENT PORTAL</small></div>
        <nav aria-label="Student workspace">
          <button className="homeworker-nav-item" onClick={() => setSelectedOrder(null)}>My assignments</button>
          {selectedOrder && <button className="homeworker-nav-item active" onClick={() => handleChat(selectedOrder)}>Chat</button>}
        </nav>
        <div className="homeworker-student-side-bottom">
          <div className="homeworker-avatar">{user?.firstName?.slice(0, 1).toUpperCase() || user?.name?.slice(0, 1).toUpperCase() || 'S'}</div>
          <div>
            <strong>{user?.firstName || user?.name?.split(' ')[0] || 'Student'}</strong>
            <small>Student account</small>
          </div>
          <button onClick={logout} aria-label="Sign out"><LogOut size={16} /></button>
        </div>
      </aside>

      <main className="homeworker-student-main">
        <header className="homeworker-student-topbar">
          <div>
            <span>HOMEWORKER</span>
            <i>/</i>
            <b>{selectedOrder ? 'MESSAGES' : 'MY ASSIGNMENTS'}</b>
          </div>
          <button onClick={() => window.location.href = `/shop/${seller.subdomain}`}>
            Back to storefront <ArrowRight size={14} />
          </button>
        </header>

        {notice && <div className="homeworker-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
        {error && <div className="homeworker-alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}

        {selectedOrder ? (
          <div className="homeworker-chat-view">
            <HomeworkerChat
              order={selectedOrder}
              messages={messages}
              onSendMessage={sendMessage}
              draft={messageDraft}
              onDraftChange={setMessageDraft}
              currentUser="student"
              seller={seller}
            />
          </div>
        ) : (
          <div className="homeworker-assignment-list">
            <div className="homeworker-list-heading">
              <div><p className="homeworker-kicker">YOUR ASSIGNMENTS</p><h2>My homework</h2></div>
              <span>{orders.length} {orders.length === 1 ? 'assignment' : 'assignments'}</span>
            </div>

            {orders.length ? (
              <div className="homeworker-assignment-grid">
                {orders.map((order) => {
                  const hwData = readHomeworkerOrder(order);
                  const isCompleted = order.status === 'shipped' || order.status === 'delivered';
                  const canDownload = isCompleted && (order.remainingBalance || 0) <= 0;

                  return (
                    <article key={order.id} className="homeworker-assignment-card">
                      <div className="homeworker-assignment-header">
                        <span className={`assignment-status ${getStatusColor(order.status)}`}>{getStatusLabel(order.status)}</span>
                        <span className="homeworker-assignment-price">{formatPrice(order.total, order.currency || 'USD')}</span>
                      </div>
                      <div className="homeworker-assignment-body">
                        <h3>{order.items[0]?.productName || 'Assignment'}</h3>
                        {hwData && (
                          <div className="homeworker-assignment-details">
                            <span><Clock3 size={14} /> {hwData.questionCount > 0 ? `${hwData.questionCount} questions` : `${hwData.pageCount} pages`}</span>
                            <span><CalendarDays size={14} /> Deadline: {new Date(hwData.deadline).toLocaleDateString()}</span>
                            <span><Star size={14} /> {hwData.academicLevel}</span>
                          </div>
                        )}
                      </div>
                      <div className="homeworker-assignment-summary">
                        <div><span>Deposit paid</span><strong>{formatPrice(order.amountPaid || 0, order.currency || 'USD')}</strong></div>
                        {(order.remainingBalance || 0) > 0 && (
                          <div><span>Balance due</span><strong className="homeworker-balance-due">{formatPrice(order.remainingBalance || 0, order.currency || 'USD')}</strong></div>
                        )}
                      </div>
                      <div className="homeworker-assignment-actions">
                        {hwData?.workerId && (
                          <button className="homeworker-outline-button" onClick={() => handleChat(order)}>
                            <MessageCircle size={14} /> Message expert
                          </button>
                        )}
                        {isCompleted && !canDownload && (order.remainingBalance || 0) > 0 && (
                          <button className="homeworker-button homeworker-button-primary" onClick={() => payBalance(order)}>
                            <Wallet size={14} /> Pay balance ({formatPrice(order.remainingBalance || 0, order.currency || 'USD')})
                          </button>
                        )}
                        {canDownload && hwData?.deliverableUrls?.map((url, index) => (
                          <button key={`${url}-${index}`} className="homeworker-button homeworker-button-green" onClick={() => downloadFile(url)}>
                            <Download size={14} /> {hwData.deliverableUrls!.length > 1 ? `Download file ${index + 1}` : 'Download assignment'}
                          </button>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="homeworker-empty">
                <ShoppingBag size={32} />
                <h3>No assignments yet.</h3>
                <p>Submit your first assignment on the Homeworker storefront.</p>
                <a className="homeworker-button homeworker-button-primary" href={`/shop/${seller?.subdomain || ''}`}>
                  Submit homework <ArrowRight size={15} />
                </a>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default HomeworkerStudent;
