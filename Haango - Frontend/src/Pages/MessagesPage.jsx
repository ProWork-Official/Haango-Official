import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { ArrowLeft, BadgeCheck, Calendar, Flag, MoreVertical, Phone, Send, Shield, X } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import HaangoDialog from '../Components/HaangoDialog';
import CallScreen from '../Components/CallScreen';
import {
  playCallAcceptedTone,
  playCallEndedTone,
  startCallTone,
  stopCallTone,
} from '../lib/callTone';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5005';

function formatTime(value) {
  return value ? new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
}

function renderUserAvatar(user, sizeClass) {
  const image = user?.image || user?.profileImage || '';
  const initials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase()
    : '?';

  return (
    <div className={`relative ${sizeClass}`}>
      {image ? (
        <img
          src={image}
          alt={user?.name || 'User'}
          className="h-full w-full rounded-full object-cover bg-coral-100"
          onError={(event) => {
            const img = event.currentTarget;
            img.style.display = 'none';
            const fallback = img.parentElement?.querySelector('[data-avatar-fallback]');
            if (fallback) fallback.classList.remove('hidden');
          }}
        />
      ) : null}
      <div data-avatar-fallback className={`${image ? 'hidden' : ''} flex h-full w-full items-center justify-center rounded-full bg-coral-100 font-semibold text-coral-700`}>
        {initials}
      </div>
    </div>
  );
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
  const [callState, setCallState] = useState('idle');
  const [callType, setCallType] = useState('outgoing');
  const [callPeer, setCallPeer] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const callIdRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const callTimerRef = useRef(null);
  const callTimeoutRef = useRef(null);

  const active = conversations.find((conversation) => conversation.id === activeId);

  const clearCallTimeout = () => {
    if (callTimeoutRef.current) {
      window.clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  const cleanupCallSession = (nextState = 'idle') => {
    stopCallTone();
    clearCallTimeout();

    if (callTimerRef.current) {
      window.clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }

    setCallState(nextState);
    setCallType('outgoing');
    setCallPeer(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsSpeakerOn(true);
    callIdRef.current = null;
    pendingOfferRef.current = null;
  };

  const ensureAudioPermission = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access is not supported in this browser.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    localStreamRef.current = stream;
    return stream;
  };

  const setupPeerConnection = (stream) => {
    const peerConnection = new window.RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    stream.getAudioTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate || !socketRef.current || !callIdRef.current || !callPeer) return;
      socketRef.current.emit('webrtc:ice-candidate', {
        type: 'webrtc:ice-candidate',
        callId: callIdRef.current,
        fromUserId: profile?.id,
        toUserId: callPeer.id,
        candidate: event.candidate,
      });
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  };

  const startCallTimer = () => {
    if (callTimerRef.current) {
      window.clearInterval(callTimerRef.current);
    }

    callTimerRef.current = window.setInterval(() => {
      setCallDuration((current) => current + 1);
    }, 1000);
  };

  const startOutgoingCall = async () => {
    if (!active?.otherUser || !profile?.id) return;

    const peerInfo = active.otherUser;
    const callId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    callIdRef.current = callId;

    try {
      const stream = await ensureAudioPermission();
      const peerConnection = setupPeerConnection(stream);
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      setCallPeer(peerInfo);
      setCallType('outgoing');
      setCallState('dialing');
      setIsSpeakerOn(true);
      startCallTone('outgoing');
      clearCallTimeout();
      callTimeoutRef.current = window.setTimeout(() => {
        if (!callIdRef.current) return;

        if (socketRef.current) {
          socketRef.current.emit('call:timeout', {
            type: 'call:timeout',
            callId: callIdRef.current,
            fromUserId: profile.id,
            toUserId: peerInfo.id,
          });
        }

        stopCallTone();
        playCallEndedTone();
        cleanupCallSession('missed');
      }, 30000);

      socketRef.current?.emit('call:invite', {
        type: 'call:invite',
        callId,
        fromUserId: profile.id,
        toUserId: peerInfo.id,
        callerUser: {
          id: profile.id,
          name: profile.name || profile.full_name || 'You',
        },
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
      });
    } catch (callError) {
      setError(callError.message || 'Unable to start the voice call.');
      cleanupCallSession();
    }
  };

  const acceptIncomingCall = async () => {
    if (!callPeer || !pendingOfferRef.current || !profile?.id) return;

    try {
      clearCallTimeout();
      stopCallTone();
      playCallAcceptedTone();

      const stream = await ensureAudioPermission();
      const peerConnection = setupPeerConnection(stream);

      await peerConnection.setRemoteDescription(new window.RTCSessionDescription(pendingOfferRef.current));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      setCallType('incoming');
      setCallState('connected');
      setIsSpeakerOn(true);
      startCallTimer();

      socketRef.current?.emit('call:answer', {
        type: 'call:answer',
        callId: callIdRef.current,
        fromUserId: profile.id,
        toUserId: callPeer.id,
        answer: {
          type: answer.type,
          sdp: answer.sdp,
        },
      });
    } catch (callError) {
      setError(callError.message || 'Unable to accept the voice call.');
      cleanupCallSession();
    }
  };

  const rejectCall = () => {
    if (!callPeer || !profile?.id) return;

    clearCallTimeout();
    stopCallTone();
    playCallEndedTone();

    if (socketRef.current && callIdRef.current) {
      socketRef.current.emit('call:reject', {
        type: 'call:reject',
        callId: callIdRef.current,
        fromUserId: profile.id,
        toUserId: callPeer.id,
      });
    }

    cleanupCallSession('missed');
  };

  const endCall = () => {
    if (!callPeer || !profile?.id) return;

    clearCallTimeout();

    if (socketRef.current && callIdRef.current) {
      socketRef.current.emit('call:end', {
        type: 'call:end',
        callId: callIdRef.current,
        fromUserId: profile.id,
        toUserId: callPeer.id,
        durationSeconds: callDuration,
      });
    }

    playCallEndedTone();
    cleanupCallSession();
  };

  useEffect(() => {
    if (!profile?.id) return undefined;

    const socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ['websocket'],
      withCredentials: true,
      auth: {
        token: localStorage.getItem('haango_access_token'),
      },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setError('');
      socket.emit('join-user', String(profile.id));
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error.message);
      setError('Unable to connect to the live call server. Please refresh and try again.');
    });

    socket.on('disconnect', () => {
      if (!callState || callState === 'idle') return;
      setError('Live call connection dropped. Please re-open the call.');
    });

    socket.on('call:invite', (payload) => {
      if (!payload || String(payload.toUserId) !== String(profile.id)) return;
      if (String(payload.fromUserId) === String(profile.id)) return;

      setCallPeer(payload.callerUser || { id: payload.fromUserId, name: 'Caller' });
      setCallType('incoming');
      setCallState('ringing');
      clearCallTimeout();
      callIdRef.current = payload.callId;
      pendingOfferRef.current = payload.offer || null;
      startCallTone('incoming');
    });

    socket.on('call:answer', (payload) => {
      if (!payload || String(payload.toUserId) !== String(profile.id)) return;
      stopCallTone();
      setCallState('connected');
      startCallTimer();
    });

    socket.on('call:reject', (payload) => {
      if (!payload || String(payload.toUserId) !== String(profile.id)) return;
      stopCallTone();
      playCallEndedTone();
      cleanupCallSession('missed');
    });

    socket.on('call:missed', (payload) => {
      if (!payload || String(payload.toUserId) !== String(profile.id)) return;
      stopCallTone();
      playCallEndedTone();
      cleanupCallSession('missed');
    });

    socket.on('call:end', (payload) => {
      if (!payload || String(payload.toUserId) !== String(profile.id)) return;
      stopCallTone();
      playCallEndedTone();
      cleanupCallSession();
    });

    socket.on('webrtc:ice-candidate', async (payload) => {
      if (!payload || String(payload.toUserId) !== String(profile.id)) return;
      if (!peerConnectionRef.current || !payload.candidate) return;

      try {
        await peerConnectionRef.current.addIceCandidate(new window.RTCIceCandidate(payload.candidate));
      } catch (_) {
        // ignore transient ICE issues
      }
    });

    socket.on('webrtc:answer', async (payload) => {
      if (!payload || String(payload.toUserId) !== String(profile.id)) return;

      if (!peerConnectionRef.current || !payload.answer) return;

      try {
        await peerConnectionRef.current.setRemoteDescription(new window.RTCSessionDescription(payload.answer));
      } catch (_) {
        // ignore remote description setup issues
      }

      stopCallTone();
      setCallState('connected');
      startCallTimer();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [profile?.id]);

  useEffect(() => {
    let mounted = true;
    apiRequest('/messages/conversations')
      .then((data) => {
        if (mounted) setConversations(Array.isArray(data) ? data : []);
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'Unable to load conversations.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeId) return undefined;

    let mounted = true;
    apiRequest(`/messages/${activeId}`)
      .then((data) => {
        if (!mounted) return;
        const nextMessages = Array.isArray(data) ? data : [];
        setMessages(nextMessages);
        nextMessages
          .filter((message) => String(message.receiverId) === String(profile?.id) && !message.isRead)
          .forEach((message) => {
            apiRequest(`/messages/${message._id}/read`, { method: 'PATCH' }).catch(() => {});
          });
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || 'Unable to load messages.');
      });

    return () => {
      mounted = false;
    };
  }, [activeId, profile?.id]);

  useEffect(() => {
    if (!activeId) return undefined;

    let activePolling = true;
    const refreshMessages = async () => {
      try {
        const latestMessages = await apiRequest(`/messages/${activeId}`);
        if (activePolling && Array.isArray(latestMessages)) setMessages(latestMessages);
      } catch (_) {
        // keep current conversation visible if polling briefly fails
      }
    };

    const interval = window.setInterval(refreshMessages, 3000);
    return () => {
      activePolling = false;
      window.clearInterval(interval);
    };
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = async () => {
    if (!input.trim() || !activeId || sending) return;

    try {
      setSending(true);
      setError('');
      const message = await apiRequest(`/messages/${activeId}`, {
        method: 'POST',
        body: JSON.stringify({ message: input.trim() }),
      });
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
          await apiRequest('/reports', {
            method: 'POST',
            body: JSON.stringify({
              reportedUserId: active.otherUser.id,
              bookingId: active.bookingId,
              reason: reason.trim(),
            }),
          });
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
          await apiRequest('/blocks', {
            method: 'POST',
            body: JSON.stringify({ blockedUserId: active.otherUser.id }),
          });
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

  if (loading) {
    return <div className="pt-24 text-center text-ink-500">Loading messages...</div>;
  }

  if (active) {
    return (
      <>
        <div className="pt-16 md:pt-18 flex h-screen flex-col animate-fade-in">
          <div className="flex shrink-0 items-center gap-3 border-b border-ink-100 bg-white px-4 py-3">
            <button onClick={() => { setActiveId(null); onBack(); }} className="p-1.5 hover:bg-ink-100 md:hidden">
              <ArrowLeft size={20} />
            </button>
            <div className="shrink-0">{renderUserAvatar(active.otherUser, 'h-10 w-10')}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate font-display font-semibold text-ink-900">{active.otherUser.name}</p>
                <BadgeCheck size={14} className="text-teal-500" />
              </div>
              <p className="text-xs text-ink-400">Paid booking conversation</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={startOutgoingCall}
                className="rounded-full bg-[#ff6b4a] p-2.5 text-white shadow-soft transition hover:brightness-110"
                aria-label="Start voice call"
              >
                <Phone size={17} />
              </button>
              <button onClick={() => setShowSafety(true)} className="p-2 text-ink-500 hover:bg-ink-100">
                <MoreVertical size={18} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-coral-100 bg-coral-50 px-4 py-2.5 text-sm text-[#eb9381]">
            <Calendar size={16} />
            {active.bookingContext}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-ink-50 px-4 py-4">
            {messages.map((message) => {
              const mine = String(message.senderId) === String(profile?.id);
              return (
                <div key={message._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${mine ? 'rounded-br-md bg-[#FF6B4A] text-white' : 'rounded-bl-md bg-white text-ink-800 shadow-soft'}`}>
                    <p className="text-sm leading-relaxed">{message.message}</p>
                    <p className={`mt-1 text-[10px] ${mine ? 'text-white/60' : 'text-ink-400'}`}>
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-ink-100 bg-white px-4 py-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="input-field flex-1 rounded-full"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="h-11 w-11 rounded-full bg-[#FF6B4A] text-white disabled:opacity-50"
            >
              <Send size={18} className="mx-auto" />
            </button>
          </div>

          {error && <p className="bg-error-50 px-4 py-2 text-sm text-error-600">{error}</p>}

          {showSafety && (
            <div className="fixed inset-0 z-50" onClick={() => setShowSafety(false)}>
              <div className="absolute inset-0 bg-ink-900/40" />
              <div className="absolute bottom-0 left-0 right-0 rounded-t-4xl bg-white p-5" onClick={(event) => event.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold">Safety</h3>
                  <button onClick={() => setShowSafety(false)}><X size={20} /></button>
                </div>
                <button onClick={reportUser} className="flex w-full items-center gap-3 rounded-2xl p-4 text-left hover:bg-error-50">
                  <Flag size={20} className="text-error-500" />
                  <span>Report {active.otherUser.name}</span>
                </button>
                <button onClick={blockUser} className="mt-2 flex w-full items-center gap-3 rounded-2xl p-4 text-left hover:bg-ink-50">
                  <Shield size={20} className="text-ink-500" />
                  <span>Block {active.otherUser.name}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <audio ref={remoteAudioRef} autoPlay playsInline />

        <CallScreen
          visible={callState !== 'idle'}
          peer={callPeer || active.otherUser}
          callState={callState}
          callType={callType}
          isMuted={isMuted}
          isSpeakerOn={isSpeakerOn}
          callDuration={callDuration}
          onAccept={acceptIncomingCall}
          onReject={rejectCall}
          onEnd={endCall}
          onToggleMute={() => {
            setIsMuted((current) => {
              const next = !current;
              if (localStreamRef.current) {
                localStreamRef.current.getAudioTracks().forEach((track) => {
                  track.enabled = !next;
                });
              }
              return next;
            });
          }}
          onToggleSpeaker={() => {
            setIsSpeakerOn((current) => {
              const next = !current;
              if (remoteAudioRef.current) {
                remoteAudioRef.current.muted = !next;
              }
              return next;
            });
          }}
        />

        <HaangoDialog open={Boolean(dialog)} {...dialog} onCancel={() => setDialog(null)} />
      </>
    );
  }

  return (
    <div className="min-h-screen pt-16 md:pt-18">
      <div className="border-b border-ink-100 bg-white">
        <div className="container-max section-pad py-6">
          <h1 className="font-display text-3xl font-extrabold text-ink-900">Messages</h1>
          <p className="mt-2 text-ink-500">Messaging is available after a booking payment is completed.</p>
        </div>
      </div>

      <div className="container-max max-w-2xl section-pad py-6">
        {error && <p className="mb-4 rounded-2xl bg-error-50 p-4 text-sm text-error-600">{error}</p>}

        {conversations.length ? (
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => setActiveId(conversation.id)}
                className="flex w-full items-center gap-4 rounded-3xl bg-white p-4 text-left hover:bg-ink-50"
              >
                <div className="shrink-0">{renderUserAvatar(conversation.otherUser, 'h-14 w-14')}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold text-ink-900">{conversation.otherUser.name}</p>
                  <p className="text-xs text-coral-500">{conversation.bookingContext}</p>
                  <p className="truncate text-sm text-ink-500">{conversation.lastMessage || 'Start the conversation'}</p>
                </div>
                <span className="text-xs text-ink-400">{formatTime(conversation.lastTime)}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-ink-500">
            <Send size={32} className="mx-auto mb-4 text-ink-300" />
            <p>No paid booking conversations yet.</p>
            <button onClick={() => onNavigate('explore')} className="btn-primary mt-5">Find a Buddy</button>
          </div>
        )}
      </div>
    </div>
  );
}
