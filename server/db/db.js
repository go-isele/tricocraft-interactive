// PostgreSQL connection + a thin async wrapper matching the shape the rest
// of this codebase already calls (`db.prepare(sql).get/all/run(...)`,
// better-sqlite3's synchronous API) — see schema.sql's header comment for
// why we moved off SQLite. `pg` is a pure-JS driver (no native binary to
// mismatch against a Node version, ever), but it's async, so every call
// site now does `await db.get(...)` / `await db.all(...)` / `await db.run(...)`
// instead of `.prepare(...).get()` etc. Two conveniences below make that a
// mechanical, low-risk rename rather than a full query rewrite:
//
//  1. toPgPlaceholders() — the whole codebase was written with SQLite's `?`
//     positional placeholders. Postgres needs `$1, $2, ...`. This translates
//     automatically (skipping `?` inside '...' string literals) so SQL text
//     didn't need touching at every call site.
//  2. withReturningId() — better-sqlite3's `.run()` returns
//     `info.lastInsertRowid`, used all over this codebase after an INSERT.
//     Postgres has no equivalent, but `INSERT ... RETURNING id` does the
//     same job — this appends it automatically to any INSERT that doesn't
//     already have a RETURNING clause, so `run()` can hand back the same
//     `{ lastInsertRowid, changes }` shape every caller already expects.
const path = require('path');
const fs = require('fs');
const { Pool, types } = require('pg');

// node-pg returns BIGINT (OID 20) as a STRING by default, to avoid silent
// precision loss above Number.MAX_SAFE_INTEGER. But this app's COUNT(*) and
// SUM(integer) queries (admin stats, etc.) are nowhere near that range, and
// the frontend does real arithmetic/formatting on them (e.g.
// `stats.revenueQuoted.toLocaleString()`, `stats.overdueInvoices ? ... :
// ...`) that assumed better-sqlite3's plain JS numbers — a string there
// silently breaks number formatting and falsy-zero checks. Parsing bigint
// as a regular number here matches the old behavior everywhere this app
// actually uses it.
types.setTypeParser(20, (val) => parseInt(val, 10));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set — see server/.env.example (e.g. postgres://triocraft:password@localhost:5432/triocraft)'
  );
}

const pool = new Pool({ connectionString });

pool.on('error', (err) => {
  // A background/idle client error (e.g. the DB restarting) — log, don't
  // crash the whole process over it.
  console.error('[db] unexpected Postgres pool error:', err.message);
});

function toPgPlaceholders(sql) {
  let out = '';
  let n = 0;
  let inString = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      inString = !inString;
      out += ch;
    } else if (ch === '?' && !inString) {
      n += 1;
      out += '$' + n;
    } else {
      out += ch;
    }
  }
  return out;
}

// fx_rates is the one table in this schema keyed by a natural key
// (currency_code) instead of a SERIAL `id` — appending `RETURNING id` to an
// INSERT against it would fail with "column id does not exist".
const TABLES_WITHOUT_ID = new Set(['fx_rates']);

function withReturningId(sql) {
  const trimmed = sql.trim();
  const match = trimmed.match(/^insert\s+into\s+["`]?(\w+)["`]?/i);
  if (match && !/returning/i.test(trimmed) && !TABLES_WITHOUT_ID.has(match[1].toLowerCase())) {
    return trimmed.replace(/;\s*$/, '') + ' RETURNING id';
  }
  return sql;
}

/** Runs an INSERT/UPDATE/DELETE. Returns { lastInsertRowid, changes } like better-sqlite3's .run(). */
async function run(sql, params = []) {
  const text = toPgPlaceholders(withReturningId(sql));
  const result = await pool.query(text, params);
  return {
    lastInsertRowid: result.rows[0] ? result.rows[0].id : undefined,
    changes: result.rowCount,
  };
}

/** Runs a SELECT, returns the first row (or undefined) — like better-sqlite3's .get(). */
async function get(sql, params = []) {
  const result = await pool.query(toPgPlaceholders(sql), params);
  return result.rows[0];
}

/** Runs a SELECT, returns every row — like better-sqlite3's .all(). */
async function all(sql, params = []) {
  const result = await pool.query(toPgPlaceholders(sql), params);
  return result.rows;
}

/** Runs raw SQL with no params (schema application, multi-statement scripts). */
async function exec(sql) {
  await pool.query(sql);
}

// Applies the schema — every statement is CREATE TABLE IF NOT EXISTS, so
// this is safe to run on every boot. Unlike better-sqlite3 (synchronous,
// applied at require-time), this is async — call `await ensureSchema()`
// once at startup (server.js) or at the top of a one-off script (db/seed.js)
// before touching any table.
async function ensureSchema() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
}

module.exports = { pool, get, all, run, exec, ensureSchema };
