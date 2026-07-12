import { Router } from "express";
import { pool } from "@workspace/db";
import { z } from "zod";
import crypto from "node:crypto";

const router = Router();

// ── Helpers ────────────────────────────────────────────────────────────────

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous O/0/I/1

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

async function uniqueCode(client: Awaited<ReturnType<typeof pool.connect>>): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = generateCode();
    const { rows } = await client.query("SELECT id FROM players WHERE code = $1", [code]);
    if (rows.length === 0) return code;
  }
  throw new Error("Could not generate unique code");
}

// ── POST /leaderboard/register ─────────────────────────────────────────────
// Create or retrieve a player by token. Returns {id, token, code, name}.

const RegisterBody = z.object({
  token: z.string().optional(),
  name: z.string().min(1).max(32).trim(),
});

router.post("/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { token, name } = parsed.data;
  const client = await pool.connect();
  try {
    // Look up by existing token
    if (token) {
      const { rows } = await client.query(
        "SELECT id, name, token, code FROM players WHERE token = $1",
        [token],
      );
      if (rows.length > 0) {
        const player = rows[0];
        if (player.name !== name) {
          await client.query("UPDATE players SET name = $1 WHERE id = $2", [name, player.id]);
          player.name = name;
        }
        res.json({ id: player.id, token: player.token, code: player.code, name: player.name });
        return;
      }
    }

    // Create new player
    const newToken = token && /^[0-9a-f-]{36}$/i.test(token) ? token : crypto.randomUUID();
    const code = await uniqueCode(client);
    const { rows } = await client.query(
      "INSERT INTO players (name, token, code) VALUES ($1, $2, $3) RETURNING id, name, token, code",
      [name, newToken, code],
    );
    res.json(rows[0]);
  } finally {
    client.release();
  }
});

// ── POST /leaderboard/scores ───────────────────────────────────────────────
// Record a run score. Returns {globalRank}.

const ScoreBody = z.object({
  token: z.string(),
  score: z.number().int().min(0),
  distanceMeters: z.number().min(0),
  coins: z.number().int().min(0),
});

router.post("/scores", async (req, res) => {
  const parsed = ScoreBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { token, score, distanceMeters, coins } = parsed.data;
  const client = await pool.connect();
  try {
    const { rows: players } = await client.query(
      "SELECT id FROM players WHERE token = $1",
      [token],
    );
    if (players.length === 0) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    const playerId = players[0].id;
    await client.query(
      "INSERT INTO scores (player_id, score, distance_meters, coins) VALUES ($1, $2, $3, $4)",
      [playerId, score, distanceMeters, coins],
    );

    // Global rank (best score per player)
    const { rows: rankRows } = await client.query(
      `WITH ranked AS (
         SELECT player_id, RANK() OVER (ORDER BY MAX(score) DESC)::int AS rank
         FROM scores GROUP BY player_id
       )
       SELECT rank FROM ranked WHERE player_id = $1`,
      [playerId],
    );

    res.json({ globalRank: rankRows[0]?.rank ?? null });
  } finally {
    client.release();
  }
});

// ── Board query helper ─────────────────────────────────────────────────────

interface BoardEntry {
  name: string;
  code: string;
  score: number;
  rank: number;
}

interface BoardResult {
  entries: BoardEntry[];
  playerRank: number | null;
  playerScore: number | null;
  playerCode: string | null;
}

async function fetchBoardRaw(
  client: Awaited<ReturnType<typeof pool.connect>>,
  extraWhere: string,
  extraParams: unknown[],
  token: string | undefined,
  limit: number,
): Promise<BoardResult> {
  const baseParams = [...extraParams];

  const { rows } = await client.query(
    `WITH board AS (
       SELECT p.id, p.name, p.code, p.token,
              MAX(s.score)::int AS score,
              RANK() OVER (ORDER BY MAX(s.score) DESC)::int AS rank
       FROM scores s
       JOIN players p ON s.player_id = p.id
       ${extraWhere}
       GROUP BY p.id, p.name, p.code, p.token
     )
     SELECT id, name, code, token, score, rank FROM board
     ORDER BY rank
     LIMIT $${baseParams.length + 1}`,
    [...baseParams, limit],
  );

  const entries: BoardEntry[] = rows.map(({ id: _id, token: _t, ...r }) => r);

  let playerRank: number | null = null;
  let playerScore: number | null = null;
  let playerCode: string | null = null;

  if (token) {
    const found = rows.find((r: any) => r.token === token);
    if (found) {
      playerRank = found.rank;
      playerScore = found.score;
      playerCode = found.code;
    } else {
      // Player may be outside the top N — look up their rank separately
      const { rows: pr } = await client.query(
        `WITH board AS (
           SELECT p.id, p.token, p.code,
                  MAX(s.score)::int AS score,
                  RANK() OVER (ORDER BY MAX(s.score) DESC)::int AS rank
           FROM scores s
           JOIN players p ON s.player_id = p.id
           ${extraWhere}
           GROUP BY p.id, p.token, p.code
         )
         SELECT rank, score, code FROM board WHERE token = $${baseParams.length + 1}`,
        [...baseParams, token],
      );
      if (pr.length > 0) {
        playerRank = pr[0].rank;
        playerScore = pr[0].score;
        playerCode = pr[0].code;
      }
    }
  }

  return { entries, playerRank, playerScore, playerCode };
}

// ── GET /leaderboard/global ────────────────────────────────────────────────

router.get("/global", async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  const client = await pool.connect();
  try {
    const result = await fetchBoardRaw(client, "", [], token, limit);
    res.json(result);
  } finally {
    client.release();
  }
});

// ── GET /leaderboard/weekly ────────────────────────────────────────────────

router.get("/weekly", async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  const client = await pool.connect();
  try {
    const result = await fetchBoardRaw(
      client,
      "WHERE s.played_at >= date_trunc('week', now())",
      [],
      token,
      limit,
    );
    res.json(result);
  } finally {
    client.release();
  }
});

// ── GET /leaderboard/friends ───────────────────────────────────────────────
// ?codes=ABC123,XYZ789&token=...  (include own code too for self-rank)

router.get("/friends", async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : undefined;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const rawCodes = typeof req.query.codes === "string" ? req.query.codes : "";
  const codes = rawCodes
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => c.length === 6)
    .slice(0, 50);

  if (codes.length === 0) {
    res.json({ entries: [], playerRank: null, playerScore: null, playerCode: null });
    return;
  }

  const client = await pool.connect();
  try {
    const result = await fetchBoardRaw(
      client,
      "WHERE p.code = ANY($1)",
      [codes],
      token,
      limit,
    );
    res.json(result);
  } finally {
    client.release();
  }
});

export default router;
