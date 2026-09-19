let audioContext = null;
let ringtoneTimer = null;

function ensureAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) {
    audioContext = new AudioContextClass();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

function createTone(context, frequency, duration, volume = 0.05, delay = 0) {
  const startAt = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startAt);

  gainNode.gain.setValueAtTime(0.0001, startAt);
  gainNode.gain.exponentialRampToValueAtTime(volume, startAt + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.04);
}

export function startCallTone(mode = 'outgoing') {
  const context = ensureAudioContext();
  if (!context) return () => {};

  stopCallTone();

  const tones = mode === 'incoming'
    ? [660, 540, 660, 540]
    : [440, 520, 620, 520];

  let index = 0;
  const playStep = () => {
    const frequency = tones[index % tones.length];
    createTone(context, frequency, 0.25, 0.04, 0.06);
    index += 1;
    ringtoneTimer = window.setTimeout(playStep, 480);
  };

  playStep();

  return () => stopCallTone();
}

export function stopCallTone() {
  if (ringtoneTimer) {
    window.clearTimeout(ringtoneTimer);
    ringtoneTimer = null;
  }
}

export function playCallEndedTone() {
  const context = ensureAudioContext();
  if (!context) return;

  createTone(context, 240, 0.12, 0.04, 0);
  setTimeout(() => createTone(context, 180, 0.15, 0.04, 0.08), 80);
}

export function playCallAcceptedTone() {
  const context = ensureAudioContext();
  if (!context) return;

  createTone(context, 440, 0.12, 0.03, 0);
  setTimeout(() => createTone(context, 560, 0.12, 0.03, 0.09), 80);
}

