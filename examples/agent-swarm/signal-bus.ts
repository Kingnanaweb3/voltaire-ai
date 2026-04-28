// ─── Signal Bus — shared JSON file for agent-to-agent communication ──────────
import * as fs from 'fs';
import * as path from 'path';

const SIGNAL_FILE = path.resolve(__dirname, '../../.agent-signal.json');

export function readSignal(): any {
  try {
    if (!fs.existsSync(SIGNAL_FILE)) return null;
    return JSON.parse(fs.readFileSync(SIGNAL_FILE, 'utf8'));
  } catch { return null; }
}

export function writeSignal(data: any): void {
  fs.writeFileSync(SIGNAL_FILE, JSON.stringify(data, null, 2));
}

export function clearSignal(): void {
  if (fs.existsSync(SIGNAL_FILE)) fs.unlinkSync(SIGNAL_FILE);
}
