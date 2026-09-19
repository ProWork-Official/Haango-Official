import {
  Check,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

function formatCallTime(seconds = 0) {
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export default function CallScreen({
  visible,
  peer,
  callState,
  callType,
  isMuted,
  isSpeakerOn,
  callDuration,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  onToggleSpeaker,
}) {
  if (!visible || !peer) return null;

  const isIncoming = callType === 'incoming';
  const statusText = callState === 'dialing'
    ? 'Calling...'
    : callState === 'ringing'
      ? 'Incoming call'
      : callState === 'connected'
        ? 'Connected'
        : callState === 'missed'
          ? 'Missed call'
          : callState === 'rejected'
            ? 'Call rejected'
            : 'Call ended';

  const isConnected = callState === 'connected';

  return (
    <div className="fixed inset-0 z-[60] bg-[#160f1c]/75 backdrop-blur-md">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,131,92,0.35),_rgba(37,20,23,0.92)_35%,_rgba(15,10,16,1)_100%)] text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between px-5 pt-5">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/80">
              {callState === 'connected' ? 'Live call' : 'Haango call'}
            </span>
            <button
              type="button"
              onClick={onEnd}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10"
              aria-label="Close call"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-6 pb-6 pt-8 text-center">
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-[0_0_35px_rgba(255,125,89,0.32)]">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#ffb18c,_#ff6b4a)] text-3xl font-black text-white shadow-lg">
                {peer.name?.charAt(0)?.toUpperCase() || 'H'}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-2">
              <Sparkles size={16} className="text-[#ffb197]" />
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/70">Voice conversation</p>
            </div>

            <h2 className="mt-4 text-3xl font-black tracking-tight">{peer.name || 'Companion'}</h2>
            <p className="mt-2 text-sm text-white/70">{statusText}</p>

            {isConnected && (
              <div className="mt-4 text-lg font-semibold text-[#ffcfbd]">
                {formatCallTime(callDuration || 0)}
              </div>
            )}

            <div className="mt-8 grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={onToggleMute}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                  isMuted
                    ? 'border-rose-400/40 bg-rose-500/20 text-rose-100'
                    : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                }`}
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                {isMuted ? 'Unmute' : 'Mute'}
              </button>

              <button
                type="button"
                onClick={onToggleSpeaker}
                className={`flex flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition ${
                  isSpeakerOn
                    ? 'border-[#ffb18c]/40 bg-[#ff8a5b]/20 text-[#fff1eb]'
                    : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                }`}
              >
                {isSpeakerOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
                {isSpeakerOn ? 'Speaker' : 'Earpiece'}
              </button>

              <button
                type="button"
                onClick={onEnd}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-rose-400/40 bg-rose-500/20 px-3 py-3 text-sm font-medium text-rose-100 transition hover:bg-rose-500/25"
              >
                <PhoneOff size={20} />
                End
              </button>
            </div>

            {(isIncoming || callState === 'dialing') && (
              <div className="mt-8 grid grid-cols-2 gap-3">
                {isIncoming && (
                  <button
                    type="button"
                    onClick={onAccept}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,_#2dd4bf,_#0ea5a4)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition hover:brightness-110"
                  >
                    <Check size={18} />
                    Accept
                  </button>
                )}

                <button
                  type="button"
                  onClick={onReject}
                  className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white ${
                    isIncoming
                      ? 'bg-[linear-gradient(135deg,_#f97316,_#ef4444)] shadow-lg shadow-rose-900/30 hover:brightness-110'
                      : 'border border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {isIncoming ? <PhoneOff size={18} /> : <X size={18} />}
                  {isIncoming ? 'Reject' : 'Cancel'}
                </button>
              </div>
            )}

            {!isConnected && !isIncoming && callState !== 'dialing' && (
              <div className="mt-8">
                <button
                  type="button"
                  onClick={onEnd}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-sm font-semibold text-white/80"
                >
                  <Phone size={16} />
                  Back to chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
