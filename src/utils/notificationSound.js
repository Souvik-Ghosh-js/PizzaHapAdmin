/**
 * Notification alert sounds for the admin panel.
 * Plays MP3 files from /sounds, looping each alert 2 times.
 */

const PLAY_COUNT = 2;

const orderAudio  = new Audio('/sounds/order-received.mp3');
const cancelAudio = new Audio('/sounds/order-cancelled.mp3');

let _activeAudio = null;
let _playsLeft = 0;
let _pendingAlert = null;  // alert blocked by autoplay policy, waiting for a user gesture
let _unlocked = false;

function _handleEnded() {
  _playsLeft -= 1;
  if (_activeAudio && _playsLeft > 0) {
    _activeAudio.currentTime = 0;
    _activeAudio.play().catch(() => {});
  } else {
    _activeAudio = null;
    _playsLeft = 0;
  }
}

orderAudio.addEventListener('ended', _handleEnded);
cancelAudio.addEventListener('ended', _handleEnded);

function _playAlert(audio) {
  stopAlertLoop();
  _pendingAlert = null;
  _activeAudio = audio;
  _playsLeft = PLAY_COUNT;
  audio.currentTime = 0;
  audio.play().then(() => {
    _unlocked = true;
  }).catch(() => {
    // Autoplay blocked — browser requires a user interaction first.
    // Keep the alert pending so it plays on the next click/keypress
    // instead of being silently dropped.
    _activeAudio = null;
    _playsLeft = 0;
    _pendingAlert = audio;
  });
}

/**
 * Play the new-order alert sound (plays 2 times).
 */
export function playOrderAlert() {
  _playAlert(orderAudio);
}

/**
 * Play the cancelled-order alert sound (plays 2 times).
 */
export function playCancelAlert() {
  _playAlert(cancelAudio);
}

/**
 * Stop any alert currently playing.
 */
export function stopAlertLoop() {
  if (_activeAudio) {
    _activeAudio.pause();
    _activeAudio.currentTime = 0;
    _activeAudio = null;
  }
  _playsLeft = 0;
  _pendingAlert = null;
}

/**
 * Check if an alert is currently playing.
 */
export function isAlertLooping() {
  return _activeAudio !== null;
}

/**
 * Unlock audio playback on the first user interaction so alerts can
 * play later from socket events (browser autoplay policy).
 * Call once at app startup.
 */
export function initAudioUnlock() {
  const onGesture = () => {
    // An alert arrived while audio was still locked — play it now.
    if (_pendingAlert) {
      const audio = _pendingAlert;
      _pendingAlert = null;
      _playAlert(audio);
      return;
    }
    // Otherwise prime the audio elements once so future alerts can
    // play without a gesture. Listeners stay attached permanently:
    // they're cheap and also cover pending alerts later on.
    if (_unlocked || _activeAudio) return;
    [orderAudio, cancelAudio].forEach(a => {
      a.muted = true;
      a.play().then(() => {
        a.pause();
        a.currentTime = 0;
        a.muted = false;
        _unlocked = true;
      }).catch(() => { a.muted = false; });
    });
  };
  document.addEventListener('click', onGesture);
  document.addEventListener('keydown', onGesture);
}
