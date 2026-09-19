function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  return AudioContextClass ? new AudioContextClass() : null;
}

function playTone(context, frequency, duration, startAt, volume = 0.04) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration - 0.02);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
}

export function startCallTone(kind = 'ringback') {
  const context = getAudioContext();
  if (!context) return () => {};
  let stopped = false;
  let timer;
  const pattern = kind === 'incoming'
    ? [{ frequency: 880, duration: 0.22 }, { frequency: 660, duration: 0.22 }]
    : [{ frequency: 480, duration: 0.35 }, { frequency: 620, duration: 0.35 }];
  const interval = kind === 'incoming' ? 1800 : 2400;

  const playPattern = () => {
    if (stopped) return;
    if (context.state === 'suspended') context.resume().catch(() => {});
    const startAt = context.currentTime + 0.01;
    pattern.forEach((tone, index) => {
      playTone(context, tone.frequency, tone.duration, startAt + index * (tone.duration + 0.04));
    });
    timer = window.setTimeout(playPattern, interval);
  };

  playPattern();
  return () => {
    stopped = true;
    window.clearTimeout(timer);
    context.close().catch(() => {});
  };
}
