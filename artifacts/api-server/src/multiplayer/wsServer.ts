// wsServer — WebSocket room server for ShadowShift multiplayer.
//
// Attach to an existing http.Server so WebSocket upgrades share the same port
// as Express. All room state lives in memory; no DB needed.

import type http from "node:http";
import { WebSocketServer } from "ws";
import { RoomManager } from "./roomManager";
import { logger } from "../lib/logger";

export function attachWebSocketServer(server: http.Server): void {
  const wss = new WebSocketServer({ noServer: true });
  const rooms = new RoomManager();

  // Stale-room cleanup every 10 min.
  setInterval(() => rooms.cleanup(), 600_000).unref();

  // Route only /api/ws (or /ws if proxy strips the prefix) upgrades to us.
  server.on("upgrade", (req, socket, head) => {
    const url = req.url ?? "";
    if (!url.endsWith("/ws")) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket as never, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  // player-id → ws reverse map so we can look up playerId on close.
  const playerIds = new Map<import("ws").WebSocket, string>();

  wss.on("connection", (ws) => {
    logger.info("WebSocket client connected");

    ws.on("message", (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        return;
      }

      const playerId = playerIds.get(ws);

      switch (msg["type"]) {
        case "create_room": {
          const name =
            (String(msg["playerName"] ?? "Player")).trim() || "Player";
          const { room, player } = rooms.createRoom(name, ws);
          playerIds.set(ws, player.id);
          rooms.send(ws, {
            type: "room_created",
            code: room.code,
            playerId: player.id,
            slot: player.slot,
            players: rooms.getPlayersInfo(room),
            isHost: true,
          });
          logger.info({ code: room.code, playerId: player.id }, "Room created");
          break;
        }

        case "join_room": {
          const code = String(msg["code"] ?? "")
            .toUpperCase()
            .trim();
          const name =
            (String(msg["playerName"] ?? "Player")).trim() || "Player";
          const result = rooms.joinRoom(code, name, ws);
          if ("error" in result) {
            rooms.send(ws, { type: "error", message: result.error });
            break;
          }
          const { room, player } = result;
          playerIds.set(ws, player.id);
          rooms.send(ws, {
            type: "room_joined",
            code: room.code,
            playerId: player.id,
            slot: player.slot,
            players: rooms.getPlayersInfo(room),
            isHost: room.hostId === player.id,
          });
          rooms.broadcast(
            room,
            {
              type: "player_joined",
              player: { id: player.id, name: player.name, slot: player.slot },
            },
            player.id,
          );
          logger.info({ code, playerId: player.id }, "Player joined room");
          break;
        }

        case "leave_room": {
          if (!playerId) break;
          handleLeave(playerId, ws);
          break;
        }

        case "start_game": {
          if (!playerId) break;
          const entry = rooms.getRoomByPlayerId(playerId);
          if (!entry) break;
          const { room } = entry;
          if (room.hostId !== playerId) break;
          room.state = "playing";
          for (const p of room.players.values()) {
            p.alive = true;
            p.score = 0;
          }
          rooms.broadcast(room, { type: "game_started" });
          logger.info({ code: room.code }, "Game started");
          break;
        }

        case "player_state": {
          if (!playerId) break;
          const entry = rooms.getRoomByPlayerId(playerId);
          if (!entry || entry.room.state !== "playing") break;
          entry.player.score = Number(msg["score"] ?? 0);
          rooms.broadcast(
            entry.room,
            {
              type: "remote_state",
              playerId,
              y: msg["y"],
              velocityY: msg["velocityY"],
              isGrounded: msg["isGrounded"],
              worldId: msg["worldId"],
              score: msg["score"],
              t: msg["t"],
            },
            playerId,
          );
          break;
        }

        case "player_died": {
          if (!playerId) break;
          const entry = rooms.getRoomByPlayerId(playerId);
          if (!entry) break;
          const { room, player } = entry;
          player.alive = false;
          player.score = Number(msg["score"] ?? 0);

          const aliveBefore = [...room.players.values()].filter(
            (p) => p.alive,
          ).length;
          const totalDead =
            room.players.size -
            [...room.players.values()].filter((p) => p.alive).length;
          const rank = room.players.size - totalDead + 1;

          rooms.broadcast(room, {
            type: "player_died",
            playerId,
            score: player.score,
            rank,
          });

          // Game over when ≤1 player left alive.
          const aliveNow = [...room.players.values()].filter(
            (p) => p.alive,
          );
          if (aliveNow.length <= 1) {
            if (aliveNow.length === 1) {
              aliveNow[0]!.alive = false;
            }
            room.state = "finished";
            const rankings = [...room.players.values()]
              .sort((a, b) => b.score - a.score)
              .map((p, i) => ({
                id: p.id,
                name: p.name,
                slot: p.slot,
                score: p.score,
                rank: i + 1,
              }));
            rooms.broadcast(room, { type: "game_over", rankings });
            logger.info({ code: room.code }, "Game over");
          }

          void aliveBefore; // suppress unused warning
          break;
        }
      }
    });

    ws.on("close", () => {
      const id = playerIds.get(ws);
      if (id) {
        handleLeave(id, ws);
        playerIds.delete(ws);
      }
      logger.info("WebSocket client disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ err }, "WebSocket error");
    });
  });

  function handleLeave(
    playerId: string,
    ws: import("ws").WebSocket,
  ): void {
    const { room, wasHost } = rooms.removePlayer(playerId);
    playerIds.delete(ws);
    if (!room) return;
    rooms.broadcast(room, { type: "player_left", playerId });
    if (wasHost && room.players.size > 0) {
      rooms.broadcast(room, {
        type: "host_changed",
        playerId: room.hostId,
      });
    }
  }
}
