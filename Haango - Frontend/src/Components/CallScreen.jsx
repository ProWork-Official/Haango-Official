import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Volume2 } from 'lucide-react';
import { apiRequest } from '../lib/api';

export default function CallScreen({ bookingId, personName, onClose }) {
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const sequenceRef = useRef(0);
  const pollRef = useRef(null);
  const candidateQueue = useRef([]);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [error, setError] = useState('');

  const signal = async (type, payload) => {
    await apiRequest(`/bookings/${bookingId}/call-signal`, {
      method: 'POST',
      body: JSON.stringify({ type, payload }),
    });
  };

  const createPeer = () => {
    if (peerRef.current) return peerRef.current;
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    peer.onicecandidate = (event) => {
      if (event.candidate) signal('ICE', event.candidate.toJSON()).catch(() => {});
    };
    peer.ontrack = (event) => {
      if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0];
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

  const handleSignal = async (message) => {
    const peer = createPeer();
    if (message.type === 'HANGUP') {
      onClose();
      return;
    }
    if (message.type === 'OFFER') {
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
        const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (!active) return;
        streamRef.current = media;
        if (localVideo.current) localVideo.current.srcObject = media;
        const joined = await apiRequest(`/bookings/${bookingId}/call-signal/join`, { method: 'POST' });
        createPeer();
        if (joined.initiator) {
          const peer = peerRef.current;
          media.getTracks().forEach((track) => peer.addTrack(track, media));
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          await signal('OFFER', offer);
        } else {
          media.getTracks().forEach((track) => peerRef.current.addTrack(track, media));
        }
        pollRef.current = window.setInterval(async () => {
          try {
            const messages = await apiRequest(`/bookings/${bookingId}/call-signal?after=${sequenceRef.current}`);
            for (const message of messages) {
              sequenceRef.current = Math.max(sequenceRef.current, message.sequence);
              await handleSignal(message);
            }
          } catch (_) { /* Polling retries on the next interval. */ }
        }, 700);
      } catch (callError) {
        setError(callError.message || 'Camera and microphone access is required for calling.');
      }
    };
    start();
    return () => {
      active = false;
      if (pollRef.current) window.clearInterval(pollRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      peerRef.current?.close();
      apiRequest(`/bookings/${bookingId}/call-signal`, { method: 'DELETE' }).catch(() => {});
    };
  }, [bookingId]);

  const toggleMute = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMuted(!track.enabled);
  };
  const toggleCamera = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOn(track.enabled);
  };

  return (
    <div className="fixed inset-0 z-80 flex flex-col bg-[#101114] text-white">
      <div className="flex items-center justify-between px-5 py-4">
        <div><p className="text-xs uppercase tracking-[0.2em] text-white/50">Haango call</p><h2 className="mt-1 text-lg font-bold">{personName || 'Booking call'}</h2></div>
        <span className="text-xs text-white/60">{connected ? 'Connected' : 'Connecting...'}</span>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#191b20] p-4">
        <video ref={remoteVideo} autoPlay playsInline className="h-full max-h-[72vh] w-full rounded-3xl object-cover" />
        <video ref={localVideo} autoPlay muted playsInline className="absolute bottom-6 right-6 h-32 w-24 rounded-2xl border border-white/20 bg-black object-cover shadow-2xl" />
        {error && <p className="absolute left-5 right-5 top-5 rounded-xl bg-red-500/90 p-3 text-sm">{error}</p>}
      </div>
      <div className="flex items-center justify-center gap-4 px-5 py-6">
        <button onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'} className="rounded-full bg-white/10 p-4 hover:bg-white/20">{muted ? <MicOff size={21} /> : <Mic size={21} />}</button>
        <button onClick={toggleCamera} title={cameraOn ? 'Turn camera off' : 'Turn camera on'} className="rounded-full bg-white/10 p-4 hover:bg-white/20">{cameraOn ? <Camera size={21} /> : <CameraOff size={21} />}</button>
        <button onClick={onClose} title="End call" className="rounded-full bg-red-500 p-4 hover:bg-red-600"><PhoneOff size={21} /></button>
        <button title="Speaker" className="rounded-full bg-white/10 p-4 hover:bg-white/20"><Volume2 size={21} /></button>
      </div>
    </div>
  );
}
