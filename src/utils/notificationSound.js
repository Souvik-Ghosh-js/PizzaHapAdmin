/**
 * Loud notification alert using Web Audio API.
 * No audio file needed — generates tones programmatically.
 * Loops continuously until stopAlertLoop() is called.
 */

let audioCtx = null;
let _loopInterval = null;

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

function _playOrderBeeps() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    playBeep(800,  now,       0.15, 0.6);
    playBeep(1000, now + 0.2, 0.15, 0.6);
    playBeep(1200, now + 0.4, 0.25, 0.7);
  } catch (_) {}
}

function _playCancelBeeps() {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    playBeep(600, now,       0.2, 0.6);
    playBeep(400, now + 0.3, 0.3, 0.7);
  } catch (_) {}
}

/**
 * Play a loud alert for new orders — loops every 1.5 seconds until stopped.
 */
export function playOrderAlert() {
  stopAlertLoop();
  _playOrderBeeps();
  _loopInterval = setInterval(_playOrderBeeps, 1500);
}

/**
 * Play a warning alert for cancelled orders — loops every 1.5 seconds until stopped.
 */
export function playCancelAlert() {
  stopAlertLoop();
  _playCancelBeeps();
  _loopInterval = setInterval(_playCancelBeeps, 1500);
}

/**
 * Stop the looping notification alert.
 * Call this when the admin accepts/rejects the order.
 */
export function stopAlertLoop() {
  if (_loopInterval) {
    clearInterval(_loopInterval);
    _loopInterval = null;
  }
}

/**
 * Check if an alert is currently looping.
 */
export function isAlertLooping() {
  return _loopInterval !== null;
}
