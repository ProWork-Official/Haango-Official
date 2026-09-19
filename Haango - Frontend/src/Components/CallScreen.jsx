import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { startCallTone } from '../lib/callTone';

export default function CallScreen({ bookingId, personName, callId, mode, role, accepted: acceptedProp = false, expiresAt, ringbackStop, onClose }) {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const remoteAudio = useRef(null);
  const peerRef = useRef(null);
  const mediaRef = useRef(null);
  const eventSourceRef = useRef(null);
  const candidateQueue = useRef([]);
  const startedMedia = useRef(false);
  const ringbackStopRef = useRef(() => {});
  const unansweredTimeoutRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [accepted, setAccepted] = useState(acceptedProp);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(mode === 'VIDEO');
  const [speakerOn, setSpeakerOn] = useState(true);
  const [error, setError] = useState('');

  const sendSignal = async (type, payload = {}) => {
    await apiRequest(`/bookings/${bookingId}/call-signal`, {
      method: 'POST',
      body: JSON.stringify({ type, callId, mode, payload }),
    });
  };

  const createPeer = () => {
    if (peerRef.current) return peerRef.current;
    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peer.onicecandidate = (event) => {
      if (event.candidate) sendSignal('ICE', event.candidate.toJSON()).catch(() => {});
    };
    peer.ontrack = (event) => {
      const element = mode === 'VIDEO' ? remoteVideo.current : remoteAudio.current;
      if (!element) return;
      element.srcObject = event.streams[0];
      element.muted = false;
      element.volume = 1;
      element.play().catch(() => setError('Click the speaker button once to enable call audio.'));
    };
    peer.onconnectionstatechange = () => {
      setConnected(['connected', 'completed'].includes(peer.connectionState));
      if (peer.connectionState === 'failed') setError('Call connection failed. Check the network and try again.');
    };
    peerRef.current = peer;
    return peer;
  };

  const startMedia = async (createOffer) => {
    if (startedMedia.current) return;
    startedMedia.current = true;
    const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'VIDEO' });
    mediaRef.current = media;
    if (localVideo.current) localVideo.current.srcObject = media;
    const peer = createPeer();
    media.getTracks().forEach((track) => peer.addTrack(track, media));
    if (createOffer) {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await sendSignal('OFFER', offer);
    }
  };

  const flushCandidates = async () => {
    const peer = peerRef.current;
    while (peer && candidateQueue.current.length) await peer.addIceCandidate(candidateQueue.current.shift());
  };

  useEffect(() => {
    let mounted = true;
    if (acceptedProp) setAccepted(true);
    unansweredTimeoutRef.current = role === 'CALLER' && expiresAt
      ? window.setTimeout(() => {
        sendSignal('END').catch(() => {});
        setError('No answer. Call ended.');
        window.setTimeout(onClose, 700);
      }, Math.max(0, expiresAt - Date.now()))
      : null;
    const stopRingback = role === 'CALLER' ? (ringbackStop || startCallTone('ringback')) : () => {};
    ringbackStopRef.current = stopRingback;
    const connect = async () => {
      try {
        if (role === 'CALLEE') await startMedia(false);
        const token = localStorage.getItem('haango_access_token');
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';
        const stream = new EventSource(`${apiBase}/bookings/${bookingId}/call-signals/stream?access_token=${encodeURIComponent(token || '')}`);
        eventSourceRef.current = stream;
        stream.onmessage = async (event) => {
          if (!mounted) return;
          try {
            const signal = JSON.parse(event.data);
            if (signal.callId !== callId) return;
            if (signal.type === 'ACCEPT' && role === 'CALLER') {
              setAccepted(true);
              if (unansweredTimeoutRef.current) window.clearTimeout(unansweredTimeoutRef.current);
              ringbackStopRef.current();
              await startMedia(true);
            }
            if (signal.type === 'REJECT' || signal.type === 'END') {
              ringbackStopRef.current();
              setError(signal.type === 'REJECT' ? 'Call rejected.' : 'Call ended.');
              window.setTimeout(onClose, 700);
            }
            if (signal.type === 'OFFER') {
              const peer = createPeer();
              await peer.setRemoteDescription(signal.payload);
              await flushCandidates();
              const answer = await peer.createAnswer();
              await peer.setLocalDescription(answer);
              await sendSignal('ANSWER', answer);
            }
            if (signal.type === 'ANSWER') {
              await peerRef.current?.setRemoteDescription(signal.payload);
              await flushCandidates();
            }
            if (signal.type === 'ICE') {
              if (peerRef.current?.remoteDescription) await peerRef.current.addIceCandidate(signal.payload);
              else candidateQueue.current.push(signal.payload);
            }
          } catch (_) {
            // Ignore keep-alive and non-signal event data.
          }
        };
        stream.onerror = () => { if (mounted) setError('Call signaling connection lost.'); };
      } catch (callError) {
        if (mounted) setError(callError.message || 'Camera and microphone access is required.');
      }
    };
    connect();
    return () => {
      mounted = false;
      if (unansweredTimeoutRef.current) window.clearTimeout(unansweredTimeoutRef.current);
      stopRingback();
      eventSourceRef.current?.close();
      mediaRef.current?.getTracks().forEach((track) => track.stop());
      peerRef.current?.close();
      sendSignal('END').catch(() => {});
    };
  }, [bookingId, callId, mode, role, expiresAt, acceptedProp]);

  const endCall = async () => {
    await sendSignal('END').catch(() => {});
    onClose();
  };
  const toggleMute = () => {
    const track = mediaRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  };
  const toggleCamera = () => {
    const track = mediaRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOn(track.enabled);
  };
  const toggleSpeaker = () => {
    const element = remoteAudio.current || remoteVideo.current;
    if (!element) return;
    const nextSpeakerState = !speakerOn;
    element.muted = !nextSpeakerState;
    element.volume = nextSpeakerState ? 1 : 0;
    element.play().catch(() => {});
    setSpeakerOn(nextSpeakerState);
  };

  return (
    <div className="fixed inset-0 z-100 flex flex-col bg-[#101114] text-white">
      <div className="flex items-center justify-between px-5 py-4"><div><p className="text-xs uppercase tracking-[0.2em] text-white/50">Haango {mode === 'VIDEO' ? 'video' : 'voice'} call</p><h2 className="mt-1 text-lg font-bold">{personName}</h2></div><span className="text-xs text-white/60">{connected ? 'Connected' : accepted ? 'Accepted, connecting...' : role === 'CALLER' ? 'Calling...' : 'Connecting...'}</span></div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#191b20] p-4" onClick={() => { const element = remoteAudio.current || remoteVideo.current; element?.play().catch(() => {}); }}>
        {mode === 'VIDEO' ? <><video ref={remoteVideo} autoPlay playsInline className="h-full max-h-[72vh] w-full rounded-3xl object-cover" /><video ref={localVideo} autoPlay muted playsInline className="absolute bottom-6 right-6 h-32 w-24 rounded-2xl border border-white/20 bg-black object-cover shadow-2xl" /></> : <><audio ref={remoteAudio} autoPlay /><div className="text-center"><div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-4xl font-bold">{personName?.[0]?.toUpperCase() || '?'}</div><p className="mt-4 text-lg font-semibold">Voice call</p></div></>}
        {error && <p className="absolute left-5 right-5 top-5 rounded-xl bg-red-500/90 p-3 text-sm">{error}</p>}
      </div>
      <div className="flex items-center justify-center gap-4 px-5 py-6"><button onClick={toggleMute} title={muted ? 'Unmute microphone' : 'Mute microphone'} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'} className="rounded-full bg-white/10 p-4 hover:bg-white/20">{muted ? <MicOff size={21} /> : <Mic size={21} />}</button>{mode === 'VIDEO' && <button onClick={toggleCamera} title={cameraOn ? 'Turn camera off' : 'Turn camera on'} aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'} className="rounded-full bg-white/10 p-4 hover:bg-white/20">{cameraOn ? <Camera size={21} /> : <CameraOff size={21} />}</button>}<button onClick={endCall} title="End call" aria-label="End call" className="rounded-full bg-red-500 p-4 hover:bg-red-600"><PhoneOff size={21} /></button><button onClick={toggleSpeaker} title={speakerOn ? 'Turn speaker off' : 'Turn speaker on'} aria-label={speakerOn ? 'Turn speaker off' : 'Turn speaker on'} className="rounded-full bg-white/10 p-4 hover:bg-white/20">{speakerOn ? <Volume2 size={21} /> : <VolumeX size={21} />}</button></div>
    </div>
  );
}
