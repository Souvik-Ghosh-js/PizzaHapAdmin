/**
 * Loud notification alert using Web Audio API.
 * No audio file needed — generates tones programmatically.
 */

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playBeep(frequency, startTime, duration, volume = 0.5) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = frequency;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Play a loud alert for new orders — 3 ascending beeps, repeated for 5 seconds.
 */
export function playOrderAlert() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    // Repeat the 3-beep pattern every 1 second (5 times total)
    for (let i = 0; i < 5; i++) {
      const wait = i * 1.0;
      playBeep(800,  now + wait,       0.15, 0.6);
      playBeep(1000, now + wait + 0.2, 0.15, 0.6);
      playBeep(1200, now + wait + 0.4, 0.25, 0.7);
    }
  } catch (_) { /* audio not supported */ }
}

/**
 * Play a warning alert for cancelled orders — 2 low descending beeps, repeated for 5 seconds.
 */
export function playCancelAlert() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    // Repeat every 1 second (5 times total)
    for (let i = 0; i < 5; i++) {
      const wait = i * 1.0;
      playBeep(600, now + wait,       0.2, 0.6);
      playBeep(400, now + wait + 0.3, 0.3, 0.7);
    }
  } catch (_) { /* audio not supported */ }
}
