/**
 * Notification alert sounds for the admin panel.
 * Plays MP3 files from /sounds, looping each alert 2 times.
 */

const PLAY_COUNT = 2;

const orderAudio  = new Audio('/sounds/order-received.mp3');
const cancelAudio = new Audio('/sounds/order-cancelled.mp3');

let _activeAudio = null;
let _playsLeft = 0;

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
  _activeAudio = audio;
  _playsLeft = PLAY_COUNT;
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Autoplay blocked — browser requires a user interaction first.
    _activeAudio = null;
    _playsLeft = 0;
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
  const unlock = () => {
    [orderAudio, cancelAudio].forEach(a => {
      a.muted = true;
      a.play().then(() => {
        a.pause();
        a.currentTime = 0;
        a.muted = false;
      }).catch(() => { a.muted = false; });
    });
    document.removeEventListener('click', unlock);
    document.removeEventListener('keydown', unlock);
  };
  document.addEventListener('click', unlock);
  document.addEventListener('keydown', unlock);
}
