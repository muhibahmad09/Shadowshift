// ShadowShift — engine bootstrap.
//
// Wires the engine, the animated main menu, the Light/Shadow world switch
// button, the premium HUD, and the play scene together.

import { Engine } from './engine/engine.js';
import { PlayScene } from './game/playScene.js';
import { MenuScene } from './game/menuScene.js';
import { WorldSwitchButton } from './game/worldSwitchButton.js';
import { Hud } from './game/hud.js';
import { Modal } from './game/modal.js';
import { SettingsPanel } from './game/settingsPanel.js';
import { PauseMenu } from './game/pauseMenu.js';
import { GameOverScreen } from './game/gameOverScreen.js';
import { Confetti } from './game/confetti.js';
import { Sfx, Music } from './game/audio.js';
import { settings, QUALITY_PRESETS } from './game/settings.js';
import { wallet } from './game/wallet.js';
import { shopStore } from './game/shopStore.js';
import { ShopPanel } from './game/shopPanel.js';
import { applyTheme } from './game/worldManager.js';
import { missionStore } from './game/missionStore.js';
import { MissionsPanel } from './game/missionsPanel.js';
import { achievementStore } from './game/achievementStore.js';
import { AchievementsPanel } from './game/achievementsPanel.js';
import { AchievementToast } from './game/achievementToast.js';

// Apply the persisted Color Theme (or the Classic default) before the menu
// and play scenes render their first frame.
applyTheme(shopStore.getEquippedItem('themes')?.theme);

const canvas = document.getElementById('game-canvas');
const switchButtonEl = document.getElementById('switch-world-btn');
const hudWorldEl = document.getElementById('hud-world');

const hud = new Hud({
  scoreEl: document.getElementById('hud-score'),
  distanceEl: document.getElementById('hud-distance'),
  coinsEl: document.getElementById('hud-coins'),
  bestEl: document.getElementById('hud-best'),
  bestCardEl: document.getElementById('hud-best-card'),
});

const modal = new Modal({
  overlayEl: document.getElementById('modal-overlay'),
  titleEl: document.getElementById('modal-title'),
  bodyEl: document.getElementById('modal-body'),
  actionsEl: document.getElementById('modal-actions'),
});

// Shared across scenes so preferences (Settings) affect gameplay regardless
// of which scene created these instances.
const sfx = new Sfx();
sfx.setMuted(!settings.soundOn);

const music = new Music();

const engine = new Engine(canvas, {
  maxDpr: settings.qualityPreset.maxDpr,
});

// Keep the engine's render resolution and the shared Sfx mute state in sync
// with Settings any time they change, from any source (menu or gameplay).
settings.onChange((state) => {
  engine.setMaxDpr(QUALITY_PRESETS[state.graphicsQuality].maxDpr);
  sfx.setMuted(!state.soundOn);
});

function syncMusic() {
  if (settings.musicOn) {
    music.start();
  } else {
    music.stop();
  }
}

// Starting audio requires a user gesture in most browsers — try once on the
// first interaction so music comes up automatically for users who never
// touch the Settings toggle.
document.addEventListener('pointerdown', syncMusic, { once: true });
document.addEventListener('keydown', syncMusic, { once: true });

// A single delegated listener covers every button in the app (menu, pause,
// settings, game over, modal) instead of wiring a click sound into each
// DOM binder individually. The world-switch button is excluded — it plays
// its own distinct "world switch" sound from PlayScene instead of a
// generic click, so it doesn't fire both.
document.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || button === switchButtonEl) return;
  sfx.playClick();
});

const menuScene = new MenuScene({
  menuEl: document.getElementById('main-menu'),
  highScoreEl: document.getElementById('menu-highscore'),
});

// Coin badge on the main menu — kept live for the whole session so it's
// already correct the moment the player lands back on the menu.
const menuCoinsEl = document.getElementById('menu-coins');
function syncMenuCoins() {
  menuCoinsEl.textContent = String(wallet.balance);
}
syncMenuCoins();
wallet.onChange(syncMenuCoins);

const pauseMenu = new PauseMenu({
  panelEl: document.getElementById('pause-menu'),
  resumeBtnEl: document.getElementById('pause-resume-btn'),
  restartBtnEl: document.getElementById('pause-restart-btn'),
  mainMenuBtnEl: document.getElementById('pause-mainmenu-btn'),
  settingsBtnEl: document.getElementById('pause-settings-btn'),
});

const confetti = new Confetti(document.getElementById('confetti-canvas'));

const gameOverScreen = new GameOverScreen({
  panelEl: document.getElementById('game-over-screen'),
  titleEl: document.getElementById('game-over-title'),
  scoreEl: document.getElementById('go-score'),
  highScoreEl: document.getElementById('go-highscore'),
  distanceEl: document.getElementById('go-distance'),
  coinsEl: document.getElementById('go-coins'),
  highScoreBadgeEl: document.getElementById('game-over-highscore-badge'),
  restartBtnEl: document.getElementById('go-restart-btn'),
  mainMenuBtnEl: document.getElementById('go-mainmenu-btn'),
  shareBtnEl: document.getElementById('go-share-btn'),
  shareFeedbackEl: document.getElementById('go-share-feedback'),
});

gameOverScreen.setHandlers({
  onRestart: () => {
    gameOverScreen.hide();
    confetti.clear();
    playScene.restart();
  },
  onMainMenu: () => {
    gameOverScreen.hide();
    confetti.clear();
    engine.scenes.switchTo('menu');
  },
  onShare: () => shareScore(playScene.scoreManager),
});

async function shareScore(scoreManager) {
  const score = Math.floor(scoreManager.score);
  const distance = Math.floor(scoreManager.distanceMeters);
  const coins = scoreManager.coins;
  const text = `I scored ${score} in ShadowShift! 🌗 ${distance}m traveled, ${coins} coins collected. Can you beat it?`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'ShadowShift', text, url: window.location.href });
      return;
    } catch {
      // User cancelled the native share sheet, or it's unsupported for this
      // payload — fall through to the clipboard fallback below.
    }
  }

  try {
    await navigator.clipboard.writeText(`${text} ${window.location.href}`);
    gameOverScreen.showShareFeedback('Copied to clipboard!');
  } catch {
    gameOverScreen.showShareFeedback('Could not copy — share manually.');
  }
}

const playScene = new PlayScene({
  worldLabelEl: hudWorldEl,
  hud,
  sfx,
  onPauseChange: (isPaused) => {
    if (isPaused) {
      pauseMenu.show();
    } else {
      pauseMenu.hide();
    }
  },
  onGameOver: (stats) => {
    gameOverScreen.show(stats);
    confetti.burst(stats.isNewHighScore ? 160 : 90);
  },
});

const shopPanel = new ShopPanel({
  panelEl: document.getElementById('shop-panel'),
  closeBtnEl: document.getElementById('shop-close-btn'),
  tabsEl: document.getElementById('shop-tabs'),
  gridEl: document.getElementById('shop-grid'),
  balanceEl: document.getElementById('shop-balance-value'),
});

document.getElementById('menu-shop-btn').addEventListener('click', () => {
  shopPanel.show();
});

const missionsPanel = new MissionsPanel({
  panelEl: document.getElementById('missions-panel'),
  closeBtnEl: document.getElementById('missions-close-btn'),
  tabsEl: document.getElementById('missions-tabs'),
  listEl: document.getElementById('missions-list'),
  balanceEl: document.getElementById('missions-balance-value'),
});

document.getElementById('menu-missions-btn').addEventListener('click', () => {
  missionsPanel.show();
});
// A pulsing dot on the Missions button flags an unclaimed reward without
// the player needing to open the panel first.
const menuMissionsDotEl = document.getElementById('menu-missions-dot');
function syncMissionsDot() {
  menuMissionsDotEl.hidden = !missionStore.hasClaimable();
}
syncMissionsDot();
missionStore.onChange(syncMissionsDot);

const achievementsPanel = new AchievementsPanel({
  panelEl: document.getElementById('achievements-panel'),
  closeBtnEl: document.getElementById('achievements-close-btn'),
  gridEl: document.getElementById('achievements-grid'),
});

document.getElementById('menu-achievements-btn').addEventListener('click', () => {
  achievementsPanel.show();
});

const achievementToast = new AchievementToast({
  containerEl: document.getElementById('achievement-toast-container'),
});
achievementStore.onUnlock((achievement) => achievementToast.enqueue(achievement));
const switchButton = new WorldSwitchButton(switchButtonEl, () =>
  playScene.requestWorldSwitch(),
);
playScene.worldSwitchButton = switchButton;

pauseMenu.setHandlers({
  onResume: () => playScene.resume(),
  onRestart: () => playScene.restart(),
  onMainMenu: () => {
    pauseMenu.hide();
    engine.scenes.switchTo('menu');
  },
  // Settings can be opened without leaving the pause menu behind — closing
  // Settings reveals the still-paused game underneath.
  onSettings: () => settingsPanel.show(),
});

document.getElementById('pause-btn').addEventListener('click', () => {
  playScene.pause();
});

engine.scenes.add('menu', menuScene);
engine.scenes.add('play', playScene);
engine.scenes.switchTo('menu');

engine.start();

// --- Main menu wiring -------------------------------------------------

document.getElementById('menu-play-btn').addEventListener('click', () => {
  engine.scenes.switchTo('play');
});

document
  .getElementById('menu-multiplayer-btn')
  .addEventListener('click', () => {
    modal.show({
      title: 'Multiplayer',
      body: 'Multiplayer mode is coming soon — race friends across both worlds in a future update.',
      actions: [{ label: 'Got it', primary: true }],
    });
  });

const settingsPanel = new SettingsPanel({
  panelEl: document.getElementById('settings-panel'),
  closeBtnEl: document.getElementById('settings-close-btn'),
  musicToggleEl: document.getElementById('toggle-music'),
  soundToggleEl: document.getElementById('toggle-sound'),
  vibrationToggleEl: document.getElementById('toggle-vibration'),
  qualityButtonsEl: document.getElementById('quality-options'),
  fpsValueEl: document.getElementById('settings-fps'),
  resetBtnEl: document.getElementById('reset-save-btn'),
  resetHintEl: document.getElementById('reset-hint'),
  onMusicToggle: syncMusic,
  getFps: () => engine.time.fps,
});

document.getElementById('menu-settings-btn').addEventListener('click', () => {
  settingsPanel.show();
});

document.getElementById('menu-exit-btn').addEventListener('click', () => {
  window.close();
  setTimeout(() => {
    if (!document.hidden) {
      modal.show({
        title: 'Exit',
        body: "Browsers only let game-opened tabs close themselves — you can close this tab manually to exit.",
        actions: [{ label: 'Back to Menu', primary: true }],
      });
    }
  }, 250);
});

// Exposed for debugging in the browser console during development only.
window.__shadowshift = engine;
