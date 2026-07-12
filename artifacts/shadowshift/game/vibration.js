// Vibration — tiny haptic-feedback helper gated by the Vibration setting.
// Wraps navigator.vibrate so call sites don't need to check support or the
// user's preference themselves.

import { settings } from './settings.js';

export const HAPTICS = {
  jump: 12,
  worldSwitch: 25,
  coinPickup: 10,
  gameOver: [40, 30, 40],
};

export function vibrate(pattern) {
  if (!settings.vibrationOn) return;
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;

  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw for unsupported/blocked calls — vibration is a
    // nice-to-have, never worth crashing gameplay over.
  }
}
