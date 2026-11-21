// Sound, synthesized — no audio files to ship, nothing to load.
// A tiny WebAudio helper: short tones with a quick fade, so a footstep
// is a tick and an alarm is a sting. Everything starts on the first
// user gesture, because browsers will not let audio start before one.

let ctx = null;
let muted = false;

function ensure() {
  // Outside a browser (the Node play-test, say) there is no audio
  // context at all; every sound then quietly does nothing.
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type, gain, when = 0, slideTo = null) {
  const ac = ensure();
  if (!ac || muted) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  unlock() { ensure(); },
  toggleMute() { muted = !muted; return muted; },
  get isMuted() { return muted; },

  // A soft alternate tick each step — quieter while tiptoeing.
  step(sneaking, alternate) {
    tone(alternate ? 150 : 120, 0.05, 'sine', sneaking ? 0.02 : 0.05);
  },
  pickup() {
    tone(660, 0.12, 'sine', 0.08);
    tone(990, 0.18, 'sine', 0.06, 0.07);
  },
  pebble() {
    tone(900, 0.05, 'square', 0.03);
    tone(320, 0.08, 'sine', 0.05, 0.12);
  },
  // The alarm: two rising notes. You hear it the moment a warden
  // goes from wary to chase, so the sound always means the same
  // thing — run, and break line of sight.
  alarm() {
    tone(392, 0.16, 'triangle', 0.12);
    tone(523, 0.22, 'triangle', 0.12, 0.14);
  },
  caught() {
    tone(220, 0.3, 'sawtooth', 0.08, 0, 110);
  },
  levelClear() {
    [523, 659, 784].forEach((f, i) => tone(f, 0.2, 'sine', 0.08, i * 0.1));
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'sine', 0.09, i * 0.13));
  },
};
