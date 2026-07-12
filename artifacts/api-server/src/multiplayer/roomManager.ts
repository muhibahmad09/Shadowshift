// RoomManager — in-memory room and player state for multiplayer.

import type { WebSocket } from "ws";

export interface Player {
  id: string;
  name: string;
  slot: number; // 0-3
  ws: WebSocket;
  alive: boolean;
  score: number;
}

export interface Room {
  code: string;
  hostId: string;
  players: Map<string, Player>;
  state: "lobby" | "playing" | "finished";
  createdAt: number;
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  return Array.from(
    { length: 4 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join("");
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(
    playerName: string,
    ws: WebSocket,
  ): { room: Room; player: Player } {
    let code: string;
    do {
      code = generateCode();
    } while (this.rooms.has(code));

    const player: Player = {
      id: generateId(),
      name: playerName.slice(0, 20),
      slot: 0,
      ws,
      alive: true,
      score: 0,
    };
    const room: Room = {
      code,
      hostId: player.id,
      players: new Map([[player.id, player]]),
      state: "lobby",
      createdAt: Date.now(),
    };
    this.rooms.set(code, room);
    return { room, player };
  }

  joinRoom(
    code: string,
    playerName: string,
    ws: WebSocket,
  ): { room: Room; player: Player } | { error: string } {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) return { error: "Room not found. Check the code and try again." };
    if (room.state !== "lobby")
      return { error: "Game already in progress." };
    if (room.players.size >= 4)
      return { error: "Room is full (max 4 players)." };

    const usedSlots = new Set([...room.players.values()].map((p) => p.slot));
    const slot = ([0, 1, 2, 3] as const).find((s) => !usedSlots.has(s)) ?? 3;
    const player: Player = {
      id: generateId(),
      name: playerName.slice(0, 20),
      slot,
      ws,
      alive: true,
      score: 0,
    };
    room.players.set(player.id, player);
    return { room, player };
  }

  removePlayer(playerId: string): { room: Room | null; wasHost: boolean } {
    for (const room of this.rooms.values()) {
      if (!room.players.has(playerId)) continue;
      room.players.delete(playerId);
      const wasHost = room.hostId === playerId;

      if (room.players.size === 0) {
        this.rooms.delete(room.code);
        return { room: null, wasHost };
      }

      if (wasHost) {
        room.hostId = room.players.values().next().value!.id;
      }
      return { room, wasHost };
    }
    return { room: null, wasHost: false };
  }

  getRoomByPlayerId(
    playerId: string,
  ): { room: Room; player: Player } | null {
    for (const room of this.rooms.values()) {
      const player = room.players.get(playerId);
      if (player) return { room, player };
    }
    return null;
  }

  broadcast(room: Room, message: object, excludeId?: string) {
    const data = JSON.stringify(message);
    for (const player of room.players.values()) {
      if (player.id === excludeId) continue;
      if (player.ws.readyState === 1 /* OPEN */) {
        player.ws.send(data);
      }
    }
  }

  send(ws: WebSocket, message: object) {
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(JSON.stringify(message));
    }
  }

  getPlayersInfo(room: Room) {
    return [...room.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      slot: p.slot,
      isHost: p.id === room.hostId,
    }));
  }

  /** Prune rooms older than 1 hour with no players. */
  cleanup() {
    const now = Date.now();
    for (const [code, room] of this.rooms.entries()) {
      if (now - room.createdAt > 3_600_000 && room.players.size === 0) {
        this.rooms.delete(code);
      }
    }
  }
}
