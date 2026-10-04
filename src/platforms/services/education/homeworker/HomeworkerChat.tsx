import React, { useEffect, useRef } from 'react';
import { Send, User, UserCheck } from 'lucide-react';
import { Order, Seller } from '../../../../services/api';
import { readHomeworkerOrder } from './homeworkerTypes';
import './homeworker.css';

interface ChatMessage {
  id: string;
  sender: 'student' | 'worker';
  text: string;
  timestamp: string;
}

interface Props {
  order: Order;
  messages: ChatMessage[];
  onSendMessage: (event: React.FormEvent) => void;
  draft: string;
  onDraftChange: (value: string) => void;
  sending?: boolean;
  currentUser: 'student' | 'worker';
  seller: Seller;
}

const HomeworkerChat: React.FC<Props> = ({ order, messages, onSendMessage, draft, onDraftChange, sending = false, currentUser, seller }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hwData = readHomeworkerOrder(order);
  const settings = seller?.theme?.customizations?.homeworker;
  const workers = settings?.workers || [];
  const worker = hwData?.workerId ? workers.find((w: { id: string }) => w.id === hwData.workerId) : null;

  useEffect(() => {
    messagesEndRef.current?.scrollTo({ top: messagesEndRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="homeworker-chat">
      <div className="homeworker-chat-header">
        <div className="homeworker-chat-participant">
          {currentUser === 'student' ? (
            <>
              {worker ? (
                <>
                  <span className="homeworker-chat-avatar worker-avatar">{worker.initials}</span>
                  <div>
                    <strong>{worker.name}</strong>
                    <small>{worker.subject} expert</small>
                  </div>
                </>
              ) : (
                <>
                  <span className="homeworker-chat-avatar"><UserCheck size={20} /></span>
                  <div><strong>Awaiting assignment</strong><small>Your expert will be assigned soon</small></div>
                </>
              )}
            </>
          ) : (
            <>
              <span className="homeworker-chat-avatar student-avatar">{order.customerName?.slice(0, 1).toUpperCase() || 'S'}</span>
              <div>
                <strong>{order.customerName || 'Student'}</strong>
                <small>Assignment client</small>
              </div>
            </>
          )}
        </div>
        <div className="homeworker-chat-order-info">
          <span className="homeworker-order-id">Order #{order.id.slice(-6)} · {order.status}</span>
        </div>
      </div>

      <div className="homeworker-chat-messages" ref={messagesEndRef} role="log" aria-label="Assignment messages" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 ? (
          <div className="homeworker-chat-empty">
            <User size={24} />
            <p>No messages yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <article
              key={msg.id}
              className={`homeworker-chat-message ${msg.sender === currentUser ? 'own' : 'theirs'}`}
            >
              <div className="homeworker-chat-bubble">{msg.text}</div>
              <small className="homeworker-chat-time">
                {msg.sender === currentUser ? 'You' : msg.sender === 'worker' ? worker?.name || 'Worker' : 'Student'} · {formatTime(msg.timestamp)}
              </small>
            </article>
          ))
        )}
      </div>

      <form className="homeworker-chat-compose" onSubmit={onSendMessage}>
        <input
          aria-label="Type a message"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={sending ? 'Sending message…' : 'Type your message…'}
          required
        />
        <button type="submit" aria-label="Send message" disabled={!draft.trim() || sending}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default HomeworkerChat;
