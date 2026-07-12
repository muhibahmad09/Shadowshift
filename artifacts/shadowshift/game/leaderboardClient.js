// leaderboardClient — thin fetch wrapper for the leaderboard API.
// All paths are relative so they work in both dev (proxied) and production.

const API = '/api/leaderboard';

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Leaderboard API ${path}: ${msg}`);
  }
  return res.json();
}

/**
 * Register or retrieve a player.
 * @param {string|null} token Existing token (or null for new player)
 * @param {string} name Display name
 * @returns {Promise<{id: number, token: string, code: string, name: string}>}
 */
export function registerPlayer(token, name) {
  return apiFetch('/register', {
    method: 'POST',
    body: JSON.stringify({ token, name }),
  });
}

/**
 * Submit a run score. Returns the player's new global rank.
 * @returns {Promise<{globalRank: number|null}>}
 */
export function submitScore({ token, score, distanceMeters, coins }) {
  return apiFetch('/scores', {
    method: 'POST',
    body: JSON.stringify({ token, score, distanceMeters, coins }),
  });
}

/**
 * Fetch the global all-time leaderboard.
 * @returns {Promise<{entries: Array, playerRank: number|null, playerScore: number|null, playerCode: string|null}>}
 */
export function fetchGlobal(token, limit = 50) {
  const p = new URLSearchParams({ limit });
  if (token) p.set('token', token);
  return apiFetch(`/global?${p}`);
}

/**
 * Fetch the weekly leaderboard (current Mon–Sun).
 */
export function fetchWeekly(token, limit = 50) {
  const p = new URLSearchParams({ limit });
  if (token) p.set('token', token);
  return apiFetch(`/weekly?${p}`);
}

/**
 * Fetch the friends leaderboard for a list of codes.
 * @param {string[]} codes Friend codes (6-char) — include own code for self-rank.
 */
export function fetchFriends(token, codes, limit = 50) {
  if (!codes || codes.length === 0) {
    return Promise.resolve({ entries: [], playerRank: null, playerScore: null, playerCode: null });
  }
  const p = new URLSearchParams({ limit, codes: codes.join(',') });
  if (token) p.set('token', token);
  return apiFetch(`/friends?${p}`);
}
