// MultiplayerPlayScene — extends PlayScene with network ghost players.
//
// Each client runs a full local simulation (same as single-player) and
// broadcasts their Y position at 20 Hz. Remote players are rendered as
// semi-transparent "ghost" characters with client-side interpolation.
//
// Single-player code is UNTOUCHED — this scene lives alongside PlayScene
// and is switched to only for multiplayer sessions.

import { PlayScene } from './playScene.js';
import { GhostPlayer, GHOST_COLORS } from './ghostPlayer.js';
import { vibrate, HAPTICS } from './vibration.js';
import { wallet } from './wallet.js';
import { settings } from './settings.js';

const STATE_HZ = 20; // broadcast frequency
const STATE_INTERVAL = 1 / STATE_HZ;

export class MultiplayerPlayScene extends PlayScene {
  constructor(opts = {}) {
    super(opts);
    this._mpClient = null;
    this._myPlayerId = null;
    this._mySlot = 0;
    /** @type {Map<string, GhostPlayer>} */
    this._ghosts = new Map();
    this._stateTimer = 0;
    this._onLocalEliminated = opts.onLocalEliminated ?? null;
    this._onEliminationConfirmed = opts.onEliminationConfirmed ?? null;
    this._onMultiplayerGameOver = opts.onMultiplayerGameOver ?? null;

    // Bound handlers so we can remove them on exit.
    this._handleRemoteState = (msg) => {
      const ghost = this._ghosts.get(msg.playerId);
      if (ghost) {
        ghost.addSnapshot({ y: msg.y, isGrounded: msg.isGrounded });
        ghost.score = msg.score ?? 0;
      }
    };
    this._handlePlayerDied = (msg) => {
      if (msg.playerId === this._myPlayerId) {
        // Server confirmed our elimination with the actual rank.
        this._onEliminationConfirmed?.({ rank: msg.rank, score: msg.score ?? 0 });
        return;
      }
      const ghost = this._ghosts.get(msg.playerId);
      if (ghost) {
        ghost.alive = false;
        ghost.score = msg.score ?? 0;
      }
    };
    this._handlePlayerJoined = (msg) => {
      if (!this._ghosts.has(msg.player.id) && msg.player.id !== this._myPlayerId) {
        this._ghosts.set(
          msg.player.id,
          new GhostPlayer(msg.player.id, msg.player.name, msg.player.slot),
        );
      }
    };
    this._handlePlayerLeft = (msg) => {
      this._ghosts.delete(msg.playerId);
    };
    this._handleGameOver = (msg) => {
      this._onMultiplayerGameOver?.(msg.rankings);
    };
    this._handleDisconnected = () => {
      this._onMultiplayerGameOver?.([]);
    };
  }

  /**
   * Call this before switching to the 'multiplayer' scene.
   * @param {import('./multiplayerClient.js').MultiplayerClient} client
   * @param {{ playerId: string, slot: number, players: Array }} roomInfo
   */
  init(client, roomInfo) {
    this._mpClient = client;
    this._myPlayerId = roomInfo.playerId;
    this._mySlot = roomInfo.slot;
    this._ghosts.clear();

    // Create ghost objects for all other players already in the room.
    for (const p of roomInfo.players) {
      if (p.id !== roomInfo.playerId) {
        this._ghosts.set(p.id, new GhostPlayer(p.id, p.name, p.slot));
      }
    }

    // Apply the local player's slot color as their skin.
    const colors = GHOST_COLORS[this._mySlot % GHOST_COLORS.length];
    this.player.setSkin({
      body: colors.body,
      limb: colors.limb,
      arm: colors.arm,
      glow: colors.glow,
    });
    this.player.setTrailColor(colors.limb);

    // Wire client events.
    client.on('remote_state', this._handleRemoteState);
    client.on('player_died', this._handlePlayerDied);
    client.on('player_joined', this._handlePlayerJoined);
    client.on('player_left', this._handlePlayerLeft);
    client.on('game_over', this._handleGameOver);
    client.on('disconnected', this._handleDisconnected);
  }

  onExit() {
    super.onExit();
    if (this._mpClient) {
      this._mpClient.off('remote_state', this._handleRemoteState);
      this._mpClient.off('player_died', this._handlePlayerDied);
      this._mpClient.off('player_joined', this._handlePlayerJoined);
      this._mpClient.off('player_left', this._handlePlayerLeft);
      this._mpClient.off('game_over', this._handleGameOver);
      this._mpClient.off('disconnected', this._handleDisconnected);
    }
  }

  update(deltaSeconds) {
    // Let the parent handle all local physics, scoring, collisions.
    super.update(deltaSeconds);

    // Broadcast local state at 20 Hz (stop once eliminated).
    if (!this.isGameOver && this._mpClient) {
      this._stateTimer += deltaSeconds;
      if (this._stateTimer >= STATE_INTERVAL) {
        this._stateTimer = 0;
        this._mpClient.send({
          type: 'player_state',
          y: this.player.y,
          velocityY: this.player.velocityY,
          isGrounded: this.player.isGrounded,
          worldId: this.world.current.id,
          score: Math.floor(this.scoreManager.score),
          t: performance.now(),
        });
      }
    }

    // Always update ghost interpolation (even after local elimination —
    // allows watching other players finish the race).
    for (const ghost of this._ghosts.values()) {
      ghost.update(deltaSeconds);
    }
  }

  render(ctx) {
    super.render(ctx);

    const { glowBlur } = settings.qualityPreset;

    // Draw ghost players on top of the scene.
    for (const ghost of this._ghosts.values()) {
      ghost.draw(ctx, this.player.x, this.groundY, glowBlur);
    }
  }

  /**
   * Override: send player_died to server and show the "eliminated" overlay
   * instead of the single-player game-over screen.
   */
  _triggerGameOver() {
    this.isGameOver = true;
    this.world.flashAlpha = 0.7;
    vibrate(HAPTICS.gameOver);
    this.sfx.playCollision();
    this._spawnGameOverConfetti();
    wallet.deposit(this.scoreManager.coins);

    this._mpClient?.send({
      type: 'player_died',
      score: Math.floor(this.scoreManager.score),
    });
    this._onLocalEliminated?.({
      score: Math.floor(this.scoreManager.score),
    });
  }
}
