import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Volume2 } from 'lucide-react';
import { apiRequest } from '../lib/api';

export default function CallScreen({ bookingId, personName, callType = 'VIDEO', incoming = false, onClose }) {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const remoteAudio = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const sequenceRef = useRef(0);
  const pollRef = useRef(null);
  const callIdRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const candidateQueue = useRef([]);
  const mediaStartedRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(callType === 'VIDEO');
  const [error, setError] = useState('');

  const signal = async (type, payload = {}) => apiRequest(`/bookings/${bookingId}/call-signal`, {
    method: 'POST', body: JSON.stringify({ type, payload: { ...payload, callId: callIdRef.current } }),
  });

  const createPeer = () => {
    if (peerRef.current) return peerRef.current;
    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peer.onicecandidate = (event) => { if (event.candidate) signal('ICE', event.candidate.toJSON()).catch(() => {}); };
    peer.ontrack = (event) => {
      if (callType === 'VIDEO' && remoteVideo.current) remoteVideo.current.srcObject = event.streams[0];
      if (callType === 'AUDIO' && remoteAudio.current) remoteAudio.current.srcObject = event.streams[0];
    };
    peer.onconnectionstatechange = () => {
      setConnected(['connected', 'completed'].includes(peer.connectionState));
      if (peer.connectionState === 'failed') setError('The call connection failed. Check your network and try again.');
    };
    peerRef.current = peer;
    return peer;
  };

  const flushCandidates = async (peer) => {
    while (candidateQueue.current.length) await peer.addIceCandidate(candidateQueue.current.shift());
  };

  const startMedia = async (shouldOffer) => {
    if (mediaStartedRef.current) return;
    mediaStartedRef.current = true;
    const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'VIDEO' });
    streamRef.current = media;
    if (localVideo.current) localVideo.current.srcObject = media;
    const peer = createPeer();
    media.getTracks().forEach((track) => peer.addTrack(track, media));
    if (shouldOffer) {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await signal('OFFER', offer);
    }
  };

  const handleSignal = async (message) => {
    if (message.type === 'CALL_REJECT' || message.type === 'CALL_END') {
      setError(message.type === 'CALL_REJECT' ? 'Call rejected.' : 'Call ended.');
      window.setTimeout(onClose, 700);
      return;
    }
    if (message.type === 'CALL_REQUEST' && !incoming && message.payload?.callId && message.payload.callId !== callIdRef.current) {
      const localIsCaller = callIdRef.current < message.payload.callId;
      await signal('CALL_ACCEPT', { role: localIsCaller ? 'caller' : 'receiver' });
      await startMedia(localIsCaller);
      return;
    }
    const peer = createPeer();
    if (message.type === 'CALL_ACCEPT') {
      await startMedia(message.payload?.role !== 'receiver');
    } else if (message.type === 'OFFER') {
      await peer.setRemoteDescription(message.payload);
      await flushCandidates(peer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await signal('ANSWER', answer);
    } else if (message.type === 'ANSWER') {
      await peer.setRemoteDescription(message.payload);
      await flushCandidates(peer);
    } else if (message.type === 'ICE') {
      if (peer.remoteDescription) await peer.addIceCandidate(message.payload);
      else candidateQueue.current.push(message.payload);
    }
  };

  useEffect(() => {
    let active = true;
    const start = async () => {
      try {
        await apiRequest(`/bookings/${bookingId}/call-signal/join`, { method: 'POST' });
        if (!incoming) await signal('CALL_REQUEST', { callType });
        if (incoming) {
          await signal('CALL_ACCEPT', { role: 'receiver' });
          await startMedia(false);
        }
        pollRef.current = window.setInterval(async () => {
          try {
            const messages = await apiRequest(`/bookings/${bookingId}/call-signal?after=${sequenceRef.current}`);
            for (const message of messages) {
              sequenceRef.current = Math.max(sequenceRef.current, message.sequence);
              await handleSignal(message);
            }
          } catch (_) { /* Retry on the next poll. */ }
        }, 700);
      } catch (callError) {
        if (active) setError(callError.message || 'Unable to start the call.');
      }
    };
    start();
    return () => {
      active = false;
      if (pollRef.current) window.clearInterval(pollRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      peerRef.current?.close();
      signal('CALL_END').catch(() => {});
      apiRequest(`/bookings/${bookingId}/call-signal`, { method: 'DELETE' }).catch(() => {});
    };
  }, [bookingId]);

  const toggleMute = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMuted(!track.enabled); }
  };
  const toggleCamera = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCameraOn(track.enabled); }
  };

  return (
    <div className="fixed inset-0 z-80 flex flex-col bg-[#101114] text-white">
      <div className="flex items-center justify-between px-5 py-4"><div><p className="text-xs uppercase tracking-[0.2em] text-white/50">Haango {callType === 'VIDEO' ? 'video' : 'voice'} call</p><h2 className="mt-1 text-lg font-bold">{personName || 'Booking call'}</h2></div><span className="text-xs text-white/60">{connected ? 'Connected' : incoming ? 'Connecting...' : 'Calling...'}</span></div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#191b20] p-4">
        {callType === 'VIDEO' ? <><video ref={remoteVideo} autoPlay playsInline className="h-full max-h-[72vh] w-full rounded-3xl object-cover" /><video ref={localVideo} autoPlay muted playsInline className="absolute bottom-6 right-6 h-32 w-24 rounded-2xl border border-white/20 bg-black object-cover shadow-2xl" /></> : <><audio ref={remoteAudio} autoPlay /><div className="text-center"><div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-4xl font-bold">{personName?.[0]?.toUpperCase() || '?'}</div><p className="mt-4 text-lg font-semibold">Voice call</p></div></>}
        {error && <p className="absolute left-5 right-5 top-5 rounded-xl bg-red-500/90 p-3 text-sm">{error}</p>}
      </div>
      <div className="flex items-center justify-center gap-4 px-5 py-6"><button onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'} className="rounded-full bg-white/10 p-4 hover:bg-white/20">{muted ? <MicOff size={21} /> : <Mic size={21} />}</button>{callType === 'VIDEO' && <button onClick={toggleCamera} title={cameraOn ? 'Turn camera off' : 'Turn camera on'} className="rounded-full bg-white/10 p-4 hover:bg-white/20">{cameraOn ? <Camera size={21} /> : <CameraOff size={21} />}</button>}<button onClick={onClose} title="End call" className="rounded-full bg-red-500 p-4 hover:bg-red-600"><PhoneOff size={21} /></button><button title="Speaker" className="rounded-full bg-white/10 p-4 hover:bg-white/20"><Volume2 size={21} /></button></div>
    </div>
  );
}
