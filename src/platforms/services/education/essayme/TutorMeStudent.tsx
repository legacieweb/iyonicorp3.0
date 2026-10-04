import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpenText, CalendarClock, Check, Clock3, GraduationCap, LogOut, MessageCircle, Search, Send, Star, UserRound, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import './utorme-student.css';

type View = 'discover' | 'sessions' | 'messages';
interface Tutor {
  id: string;
  name: string;
  subject: string;
  credentials: string;
  rating: string;
  rate: number;
  availability: string;
  bio: string;
  tags: string[];
  initials: string;
  color: string;
}
interface Session {
  id: string;
  tutorId: string;
  topic: string;
  date: string;
  time: string;
  status: 'requested' | 'confirmed';
}
interface ChatMessage { id: string; text: string; sender: 'student' | 'tutor'; time: string }

const tutors: Tutor[] = [
  { id: 'maya-chen', name: 'Dr. Maya Chen', subject: 'Biology', credentials: 'PhD, Molecular Biology', rating: '4.98', rate: 42, availability: 'Today, 4:30 PM', bio: 'Complex ideas, made visual. I teach biology through conversation, diagrams, and patient step-by-step explanations.', tags: ['Cell biology', 'Exam prep', 'All levels'], initials: 'MC', color: 'coral' },
  { id: 'jordan-rivera', name: 'Jordan Rivera', subject: 'Mathematics', credentials: 'MEd, Mathematics Education', rating: '4.96', rate: 38, availability: 'Today, 6:00 PM', bio: 'Build confidence with algebra, calculus, and the reasoning behind each solution. No question is too small.', tags: ['Algebra', 'Calculus', 'Test prep'], initials: 'JR', color: 'green' },
  { id: 'amara-okafor', name: 'Amara Okafor', subject: 'English', credentials: 'MA, English Literature', rating: '4.99', rate: 35, availability: 'Tomorrow, 10:00 AM', bio: 'Thoughtful reading and stronger writing start with finding your own point of view. Let us work it out together.', tags: ['Writing', 'Literature', 'ESL'], initials: 'AO', color: 'blue' },
  { id: 'leo-martin', name: 'Leo Martin', subject: 'Physics', credentials: 'MSc, Applied Physics', rating: '4.94', rate: 45, availability: 'Tomorrow, 1:30 PM', bio: 'Connect equations to the real world. I help students build intuition in mechanics, waves, and electricity.', tags: ['Mechanics', 'Electricity', 'A-level'], initials: 'LM', color: 'gold' },
];

const subjects = ['All subjects', ...Array.from(new Set(tutors.map((tutor) => tutor.subject)))];
const dateLabel = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

const TutorMeStudent: React.FC = () => {
  const { user, logout } = useAuth();
  const storageKey = `utorme-student-${user?.id || user?.email || 'preview'}`;
  const [view, setView] = useState<View>('discover');
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState('All subjects');
  const [activeTutor, setActiveTutor] = useState(tutors[0]);
  const [sessions, setSessions] = useState<Session[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]') as Session[]; } catch { return []; }
  });
  const [bookingTutor, setBookingTutor] = useState<Tutor | null>(null);
  const [booking, setBooking] = useState({ topic: '', date: '', time: '' });
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [messageDraft, setMessageDraft] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(sessions)); } catch { setNotice('Session storage is full.'); }
  }, [sessions, storageKey]);

  const filteredTutors = useMemo(() => tutors.filter((tutor) => {
    const searchable = `${tutor.name} ${tutor.subject} ${tutor.credentials} ${tutor.tags.join(' ')}`.toLowerCase();
    return (subject === 'All subjects' || tutor.subject === subject) && (!query.trim() || searchable.includes(query.trim().toLowerCase()));
  }), [query, subject]);

  const submitBooking = (event: FormEvent) => {
    event.preventDefault();
    if (!bookingTutor) return;
    setSessions((current) => [{ id: `session-${Date.now()}`, tutorId: bookingTutor.id, ...booking, status: 'requested' }, ...current]);
    setActiveTutor(bookingTutor);
    setBookingTutor(null);
    setBooking({ topic: '', date: '', time: '' });
    setNotice(`Session request sent to ${bookingTutor.name}.`);
    setView('sessions');
  };

  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    if (!messageDraft.trim()) return;
    const message: ChatMessage = { id: `message-${Date.now()}`, text: messageDraft.trim(), sender: 'student', time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) };
    setMessages((current) => ({ ...current, [activeTutor.id]: [...(current[activeTutor.id] || []), message] }));
    setMessageDraft('');
  };

  const views: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'discover', label: 'Find a tutor', icon: <Search size={18} /> },
    { id: 'sessions', label: 'My sessions', icon: <CalendarClock size={18} /> },
    { id: 'messages', label: 'Messages', icon: <MessageCircle size={18} /> },
  ];

  return <div className="utorme-student-shell">
    <aside className="utorme-student-sidebar">
      <Link to="/utorme" className="utorme-student-brand"><span><BookOpenText size={19} /></span><b>tutor<span>me</span><small>LEARNING, TOGETHER</small></b></Link>
      <p className="utorme-side-label">STUDENT SPACE</p>
      <nav aria-label="Student workspace">{views.map((item) => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}>{item.icon}{item.label}{item.id === 'sessions' && sessions.length > 0 && <span>{sessions.length}</span>}</button>)}</nav>
      <div className="utorme-student-side-bottom"><div className="utorme-learning-note"><GraduationCap size={17} /><span>Learn at your pace.<br /><b>Your goals come first.</b></span></div><div className="utorme-student-user"><span className="utorme-student-avatar">{(user?.firstName || user?.name || 'S').slice(0, 1).toUpperCase()}</span><span><b>{user?.firstName || user?.name?.split(' ')[0] || 'Student'}</b><small>Student account</small></span><button onClick={logout} aria-label="Sign out"><LogOut size={16} /></button></div></div>
    </aside>

    <main className="utorme-student-main">
      <header className="utorme-student-topbar"><div><span>TUTORME</span><i>/</i><b>{view === 'discover' ? 'TUTOR DIRECTORY' : view === 'sessions' ? 'YOUR SESSIONS' : 'MESSAGES'}</b></div><Link to="/utorme">tutorme home <ArrowRight size={14} /></Link></header>
      <div className="utorme-student-content">
        <div className="utorme-student-preview"><span><Check size={14} /> STUDENT WORKSPACE</span><span>Bookings and messages in this preview are saved on this device.</span></div>
        <section className="utorme-student-hero"><div><p>LEARNING, WITH A PERSON IN YOUR CORNER</p><h1>Find your tutor.<br /><em>Find your flow.</em></h1><span>Good learning starts with the right conversation.</span></div><div className="utorme-hero-symbol" aria-hidden="true"><div><BookOpenText size={40} /></div><span>01 / 04</span></div></section>
        {notice && <div className="utorme-student-notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}

        {view === 'discover' && <section className="utorme-discover-section">
          <div className="utorme-discover-heading"><div><p>MEET YOUR MATCH</p><h2>Good teachers make room for questions.</h2></div><span>{filteredTutors.length} tutors</span></div>
          <div className="utorme-search-row"><label><Search size={17} /><input aria-label="Search tutors" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a subject, tutor, or skill" /></label><div className="utorme-subject-filter" aria-label="Filter tutors by subject">{subjects.map((item) => <button key={item} className={subject === item ? 'active' : ''} onClick={() => setSubject(item)}>{item}</button>)}</div></div>
          <div className="utorme-tutor-grid">{filteredTutors.map((tutor) => <article className="utorme-tutor-card" key={tutor.id}><div className={`utorme-tutor-card-top tone-${tutor.color}`}><span className="utorme-tutor-initials">{tutor.initials}</span><span className="utorme-rating"><Star size={13} fill="currentColor" /> {tutor.rating}</span><span className="utorme-tutor-subject">{tutor.subject}</span></div><div className="utorme-tutor-card-body"><h3>{tutor.name}</h3><p className="utorme-tutor-credentials">{tutor.credentials}</p><p className="utorme-tutor-bio">{tutor.bio}</p><div className="utorme-tutor-tags">{tutor.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><div className="utorme-tutor-card-footer"><span><b>${tutor.rate}</b><small>/ session</small></span><button onClick={() => { setActiveTutor(tutor); setBookingTutor(tutor); }}>Book a session <ArrowRight size={15} /></button></div></div></article>)}</div>
          {filteredTutors.length === 0 && <div className="utorme-no-tutors">No tutors match that search. Try another subject or name.</div>}
        </section>}

        {view === 'sessions' && <section className="utorme-student-panel"><div className="utorme-discover-heading"><div><p>YOUR LEARNING PLAN</p><h2>Upcoming sessions</h2></div><button className="utorme-outline-button" onClick={() => setView('discover')}><Search size={15} /> Find a tutor</button></div>{sessions.length ? <div className="utorme-session-list">{sessions.map((session) => { const tutor = tutors.find((item) => item.id === session.tutorId) || tutors[0]; return <article key={session.id}><div className={`utorme-session-date tone-${tutor.color}`}><span>{dateLabel(session.date).split(' ')[0]}</span><b>{new Date(`${session.date}T12:00:00`).getDate()}</b></div><div className="utorme-session-info"><span>{tutor.subject} · {session.time}</span><h3>{session.topic}</h3><p>with {tutor.name}</p></div><span className={`utorme-session-status ${session.status}`}>{session.status === 'requested' ? 'Awaiting confirmation' : 'Confirmed'}</span><button className="utorme-session-message" onClick={() => { setActiveTutor(tutor); setView('messages'); }}><MessageCircle size={15} /> Message tutor</button></article>; })}</div> : <div className="utorme-sessions-empty"><CalendarClock size={26} /><h3>Your next great session starts here.</h3><p>Find a tutor and send a session request that fits your goals.</p><button className="utorme-primary-button" onClick={() => setView('discover')}>Explore tutors <ArrowRight size={15} /></button></div>}</section>}

        {view === 'messages' && <section className="utorme-student-panel utorme-message-panel"><div className="utorme-discover-heading"><div><p>ONE-TO-ONE CONVERSATIONS</p><h2>Message a tutor</h2></div><span>Student inbox</span></div><div className="utorme-chat-layout"><div className="utorme-chat-people">{tutors.map((tutor) => <button key={tutor.id} className={activeTutor.id === tutor.id ? 'active' : ''} onClick={() => setActiveTutor(tutor)}><span className={`utorme-mini-avatar tone-${tutor.color}`}>{tutor.initials}</span><span><b>{tutor.name}</b><small>{tutor.subject} tutor</small></span></button>)}</div><div className="utorme-chat-window"><div className="utorme-chat-person"><span className={`utorme-mini-avatar tone-${activeTutor.color}`}>{activeTutor.initials}</span><span><b>{activeTutor.name}</b><small>{activeTutor.subject} · typically replies within a day</small></span></div><div className="utorme-chat-messages">{(messages[activeTutor.id] || []).length ? (messages[activeTutor.id] || []).map((message) => <article key={message.id}><small>{message.sender === 'student' ? 'You' : activeTutor.name} · {message.time}</small><p>{message.text}</p></article>) : <div className="utorme-chat-empty"><MessageCircle size={22} /><span>Start with what you want to learn.</span></div>}</div><form className="utorme-chat-compose" onSubmit={sendMessage}><input aria-label="Write a message" value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder={`Message ${activeTutor.name.split(' ')[0]}…`} /><button disabled={!messageDraft.trim()} aria-label="Send message"><Send size={16} /></button></form></div></div></section>}

        <footer className="utorme-student-footer"><span><UserRound size={15} /> You are signed in as a student</span><Link to="/utorme">Explore uTorme <ArrowRight size={14} /></Link></footer>
      </div>
    </main>

    {bookingTutor && <div className="utorme-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBookingTutor(null); }}><section className="utorme-booking-modal" role="dialog" aria-modal="true" aria-labelledby="utorme-booking-title"><button className="utorme-modal-close" onClick={() => setBookingTutor(null)} aria-label="Close booking form"><X size={18} /></button><p>SESSION REQUEST</p><h2 id="utorme-booking-title">Meet {bookingTutor.name.split(' ')[0]}.</h2><span className="utorme-modal-subtitle">{bookingTutor.subject} · ${bookingTutor.rate} per session</span><form onSubmit={submitBooking}><label>What would you like to learn?<input required value={booking.topic} onChange={(event) => setBooking({ ...booking, topic: event.target.value })} placeholder="e.g. Get comfortable with derivatives" /></label><div className="utorme-modal-row"><label>Preferred date<input required type="date" min={new Date().toISOString().slice(0, 10)} value={booking.date} onChange={(event) => setBooking({ ...booking, date: event.target.value })} /></label><label>Time<select required value={booking.time} onChange={(event) => setBooking({ ...booking, time: event.target.value })}><option value="">Choose time</option><option>10:00 AM</option><option>1:30 PM</option><option>4:30 PM</option><option>6:00 PM</option></select></label></div><p className="utorme-modal-note"><Clock3 size={15} /> Your tutor will confirm the time in your student sessions.</p><button className="utorme-primary-button" type="submit">Send session request <ArrowRight size={16} /></button></form></section></div>}
  </div>;
};

export default TutorMeStudent;
