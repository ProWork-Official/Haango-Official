import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, BadgeCheck, Calendar, Flag, MoreVertical, Send, Shield, X } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import HaangoDialog from '../Components/HaangoDialog';

function formatTime(value) {
  return value ? new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
}

export default function MessagesPage({ activeConversationId, onNavigate, onBack }) {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(activeConversationId || null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showSafety, setShowSafety] = useState(false);
  const [dialog, setDialog] = useState(null);
  const messagesEndRef = useRef(null);
  const active = conversations.find((conversation) => conversation.id === activeId);

  useEffect(() => {
    let mounted = true;
    apiRequest('/messages/conversations')
      .then((data) => { if (mounted) setConversations(Array.isArray(data) ? data : []); })
      .catch((loadError) => { if (mounted) setError(loadError.message || 'Unable to load conversations.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!activeId) return undefined;
    let mounted = true;
    apiRequest(`/messages/${activeId}`)
      .then((data) => {
        if (!mounted) return;
        const nextMessages = Array.isArray(data) ? data : [];
        setMessages(nextMessages);
        nextMessages.filter((message) => String(message.receiverId) === String(profile?.id) && !message.isRead)
          .forEach((message) => apiRequest(`/messages/${message._id}/read`, { method: 'PATCH' }).catch(() => {}));
      })
      .catch((loadError) => { if (mounted) setError(loadError.message || 'Unable to load messages.'); });
    return () => { mounted = false; };
  }, [activeId, profile?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || !activeId || sending) return;
    try {
      setSending(true);
      setError('');
      const message = await apiRequest(`/messages/${activeId}`, { method: 'POST', body: JSON.stringify({ message: input.trim() }) });
      setMessages((current) => [...current, message]);
      setInput('');
    } catch (sendError) {
      setError(sendError.message || 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  const reportUser = async () => {
    if (!active) return;
    setDialog({
      title: 'Report this user',
      description: 'Tell Haango safety what happened. Your report will be reviewed privately.',
      confirmLabel: 'Submit report',
      fields: [{ name: 'reason', label: 'Reason', type: 'textarea', placeholder: 'Explain the concern.' }],
      onConfirm: async ({ reason }) => {
        if (!reason?.trim()) {
          setError('Please provide a report reason.');
          return;
        }
        try {
          await apiRequest('/reports', { method: 'POST', body: JSON.stringify({ reportedUserId: active.otherUser.id, bookingId: active.bookingId, reason: reason.trim() }) });
          setError('Report submitted to Haango safety.');
          setShowSafety(false);
          setDialog(null);
        } catch (reportError) {
          setError(reportError.message || 'Unable to submit report.');
        }
      },
    });
  };

  const blockUser = async () => {
    if (!active) return;
    setDialog({
      title: `Block ${active.otherUser.name}?`,
      description: 'You will no longer be able to message this person until you unblock them.',
      confirmLabel: 'Block user',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await apiRequest('/blocks', { method: 'POST', body: JSON.stringify({ blockedUserId: active.otherUser.id }) });
          setConversations((current) => current.filter((conversation) => conversation.id !== active.id));
          setActiveId(null);
          setShowSafety(false);
          setDialog(null);
        } catch (blockError) {
          setError(blockError.message || 'Unable to block user.');
        }
      },
    });
  };

  const openCall = async () => {
    try {
      const room = await apiRequest(`/bookings/${active.bookingId}/call-room`);
      window.open(room.roomUrl, '_blank', 'noopener,noreferrer');
    } catch (callError) { setError(callError.message || 'Calls unlock within two hours of the meeting.'); }
  };

  if (loading) return <div className="pt-24 text-center text-ink-500">Loading messages...</div>;

  if (active) {
    return (
      <>
      <div className="pt-16 md:pt-18 flex h-screen flex-col animate-fade-in">
        <div className="flex shrink-0 items-center gap-3 border-b border-ink-100 bg-white px-4 py-3">
          <button onClick={() => { setActiveId(null); onBack(); }} className="p-1.5 hover:bg-ink-100 md:hidden"><ArrowLeft size={20} /></button>
          <div className="h-10 w-10 rounded-full bg-coral-100" />
          <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><p className="truncate font-display font-semibold text-ink-900">{active.otherUser.name}</p><BadgeCheck size={14} className="text-teal-500" /></div><p className="text-xs text-ink-400">Paid booking conversation</p></div>
          <button onClick={() => setShowSafety(true)} className="p-2 text-ink-500 hover:bg-ink-100"><MoreVertical size={18} /></button>
          <button onClick={openCall} className="rounded-xl bg-coral-500 px-3 py-2 text-xs font-semibold text-white">Internet call</button>
        </div>
        <div className="flex items-center gap-2 border-b border-coral-100 bg-coral-50 px-4 py-2.5 text-sm text-[#eb9381]"><Calendar size={16} /> {active.bookingContext}</div>
        <div className="flex-1 space-y-3 overflow-y-auto bg-ink-50 px-4 py-4">
          {messages.map((message) => { const mine = String(message.senderId) === String(profile?.id); return <div key={message._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${mine ? 'rounded-br-md bg-[#FF6B4A] text-white' : 'rounded-bl-md bg-white text-ink-800 shadow-soft'}`}><p className="text-sm leading-relaxed">{message.message}</p><p className={`mt-1 text-[10px] ${mine ? 'text-white/60' : 'text-ink-400'}`}>{formatTime(message.createdAt)}</p></div></div>; })}
          <div ref={messagesEndRef} />
        </div>
        <div className="flex shrink-0 items-center gap-2 border-t border-ink-100 bg-white px-4 py-3"><input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="input-field flex-1 rounded-full" /><button onClick={sendMessage} disabled={!input.trim() || sending} className="h-11 w-11 rounded-full bg-[#FF6B4A] text-white disabled:opacity-50"><Send size={18} className="mx-auto" /></button></div>
        {error && <p className="bg-error-50 px-4 py-2 text-sm text-error-600">{error}</p>}
        {showSafety && <div className="fixed inset-0 z-50" onClick={() => setShowSafety(false)}><div className="absolute inset-0 bg-ink-900/40" /><div className="absolute bottom-0 left-0 right-0 rounded-t-4xl bg-white p-5" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><h3 className="font-display text-lg font-bold">Safety</h3><button onClick={() => setShowSafety(false)}><X size={20} /></button></div><button onClick={reportUser} className="flex w-full items-center gap-3 rounded-2xl p-4 text-left hover:bg-error-50"><Flag size={20} className="text-error-500" /><span>Report {active.otherUser.name}</span></button><button onClick={blockUser} className="mt-2 flex w-full items-center gap-3 rounded-2xl p-4 text-left hover:bg-ink-50"><Shield size={20} className="text-ink-500" /><span>Block {active.otherUser.name}</span></button></div></div>}
      </div>
      <HaangoDialog open={Boolean(dialog)} {...dialog} onCancel={() => setDialog(null)} />
      </>
    );
  }

  return <div className="min-h-screen pt-16 md:pt-18"><div className="border-b border-ink-100 bg-white"><div className="container-max section-pad py-6"><h1 className="font-display text-3xl font-extrabold text-ink-900">Messages</h1><p className="mt-2 text-ink-500">Messaging is available after a booking payment is completed.</p></div></div><div className="container-max max-w-2xl section-pad py-6">{error && <p className="mb-4 rounded-2xl bg-error-50 p-4 text-sm text-error-600">{error}</p>}{conversations.length ? <div className="space-y-2">{conversations.map((conversation) => <button key={conversation.id} onClick={() => setActiveId(conversation.id)} className="flex w-full items-center gap-4 rounded-3xl bg-white p-4 text-left hover:bg-ink-50"><div className="h-14 w-14 rounded-2xl bg-coral-100" /><div className="min-w-0 flex-1"><p className="font-display font-semibold text-ink-900">{conversation.otherUser.name}</p><p className="text-xs text-coral-500">{conversation.bookingContext}</p><p className="truncate text-sm text-ink-500">{conversation.lastMessage || 'Start the conversation'}</p></div><span className="text-xs text-ink-400">{formatTime(conversation.lastTime)}</span></button>)}</div> : <div className="py-20 text-center text-ink-500"><Send size={32} className="mx-auto mb-4 text-ink-300" /><p>No paid booking conversations yet.</p><button onClick={() => onNavigate('explore')} className="btn-primary mt-5">Find a Buddy</button></div>}</div></div>;
}
