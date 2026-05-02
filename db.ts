// db.ts — shared persistent state for API + agent processes
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(path.join(DB_DIR, 'voltaire.db'));
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS rebalances (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp     INTEGER NOT NULL,
    from_asset    TEXT NOT NULL,
    to_asset      TEXT NOT NULL,
    from_amount   REAL NOT NULL,
    to_amount     REAL NOT NULL,
    eth_price     REAL,
    gas_cost_usd  REAL,
    tx_hash       TEXT,
    reasoning     TEXT,
    status        TEXT NOT NULL,
    trigger_type  TEXT
  );

  CREATE TABLE IF NOT EXISTS agent_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp  INTEGER NOT NULL,
    cycle_id   TEXT,
    level      TEXT NOT NULL,
    message    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS state (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_rebalances_ts ON rebalances(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_log_ts ON agent_log(timestamp DESC);
`);

// Migrations — safe to re-run
try { db.exec('ALTER TABLE rebalances ADD COLUMN portfolio_state TEXT'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE rebalances ADD COLUMN audit_url TEXT'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE rebalances ADD COLUMN job_id TEXT'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE rebalances ADD COLUMN retry_count INTEGER'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE rebalances ADD COLUMN total_usd_value REAL'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE rebalances ADD COLUMN max_drift REAL'); } catch { /* already exists */ }
try { db.exec('ALTER TABLE rebalances ADD COLUMN user_address TEXT'); } catch { /* already exists */ }

export type Rebalance = {
  id?: number;
  timestamp: number;
  from_asset: string;
  to_asset: string;
  from_amount: number;
  to_amount: number;
  eth_price?: number;
  gas_cost_usd?: number;
  tx_hash?: string;
  reasoning?: string;
  status: 'success' | 'skipped' | 'failed';
  trigger_type?: string;
  total_usd_value?: number;
  max_drift?: number;
  portfolio_state?: string;
  user_address?: string;
  audit_url?: string;
  job_id?: string;
  retry_count?: number;
};

const insertRebalanceStmt = db.prepare(`
  INSERT INTO rebalances
  (timestamp, from_asset, to_asset, from_amount, to_amount, eth_price, gas_cost_usd, tx_hash, reasoning, status, trigger_type, total_usd_value, max_drift, portfolio_state, user_address, audit_url, job_id, retry_count)
  VALUES (@timestamp, @from_asset, @to_asset, @from_amount, @to_amount, @eth_price, @gas_cost_usd, @tx_hash, @reasoning, @status, @trigger_type, @total_usd_value, @max_drift, @portfolio_state, @user_address, @audit_url, @job_id, @retry_count)
`);

export function addRebalance(r: Rebalance): number {
  const info = insertRebalanceStmt.run({
    eth_price: null, gas_cost_usd: null, tx_hash: null, reasoning: null, trigger_type: null, total_usd_value: null, max_drift: null, portfolio_state: null, user_address: null, audit_url: null, job_id: null, retry_count: null,
    ...r,
  });
  return Number(info.lastInsertRowid);
}

export function getRebalances(limit = 100): Rebalance[] {
  return db.prepare(`SELECT * FROM rebalances ORDER BY timestamp DESC LIMIT ?`).all(limit) as Rebalance[];
}

export function getRebalancesByAddress(address: string | undefined, limit = 100): Rebalance[] {
  if (!address) return getRebalances(limit);
  return db.prepare(`SELECT * FROM rebalances WHERE lower(user_address) = lower(?) ORDER BY timestamp DESC LIMIT ?`).all(address, limit) as Rebalance[];
}

export function getLastRebalance(): Rebalance | undefined {
  return db.prepare(`SELECT * FROM rebalances ORDER BY timestamp DESC LIMIT 1`).get() as Rebalance | undefined;
}

export function getTotalGasCost(): number {
  const row = db.prepare(`SELECT COALESCE(SUM(gas_cost_usd), 0) AS total FROM rebalances WHERE status = 'success'`).get() as { total: number };
  return row.total;
}

export function getRebalanceCount(): number {
  const row = db.prepare(`SELECT COUNT(*) AS c FROM rebalances WHERE status = 'success'`).get() as { c: number };
  return row.c;
}

export type LogLine = {
  id?: number;
  timestamp: number;
  cycle_id?: string;
  level: 'info' | 'warn' | 'error';
  message: string;
};

const insertLogStmt = db.prepare(`
  INSERT INTO agent_log (timestamp, cycle_id, level, message)
  VALUES (@timestamp, @cycle_id, @level, @message)
`);

export function addLog(line: Omit<LogLine, 'id'>): void {
  insertLogStmt.run({ cycle_id: null, ...line });
}

export function getLogs(limit = 200): LogLine[] {
  return db.prepare(`SELECT * FROM agent_log ORDER BY timestamp DESC LIMIT ?`).all(limit) as LogLine[];
}

const recentLogStmt = db.prepare(`
  SELECT 1 FROM agent_log
  WHERE message = ? AND timestamp > ?
  LIMIT 1
`);

export function addLogDedup(line: Omit<LogLine, 'id'>, windowMs = 2000): boolean {
  const recent = recentLogStmt.get(line.message, line.timestamp - windowMs);
  if (recent) return false;
  addLog(line);
  return true;
}

const getStateStmt = db.prepare(`SELECT value FROM state WHERE key = ?`);
const setStateStmt = db.prepare(`
  INSERT INTO state (key, value) VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);

export function setState<T>(key: string, value: T): void {
  setStateStmt.run(key, JSON.stringify(value));
}

export function getState<T>(key: string): T | undefined {
  const row = getStateStmt.get(key) as { value: string } | undefined;
  if (!row) return undefined;
  try { return JSON.parse(row.value) as T; } catch { return undefined; }
}

export default db;
