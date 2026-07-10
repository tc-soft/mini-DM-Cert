import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { DATABASE_PATH, ADMIN_USERNAME, ADMIN_PASSWORD } from "astro:env/server";

export type Role = "admin" | "user";

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  role: Role;
  created_at: string;
}

const dbPath = resolve(DATABASE_PATH || "./data/mini-dm.db");
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
`);

// scrypt with a random 16-byte salt, stored alongside the hash as "salt:hash" (both hex).
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function seedDefaultAdmin() {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  if (count > 0) return;

  const username = ADMIN_USERNAME || "admin";
  const password = ADMIN_PASSWORD || randomBytes(9).toString("base64url");

  db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')").run(
    username,
    hashPassword(password),
  );

  if (!ADMIN_PASSWORD) {
    // eslint-disable-next-line no-console
    console.log(
      `\n[mini-dm] Seeded default admin account — username: "${username}", password: "${password}"\n` +
        "[mini-dm] This password is only shown once. Change it after first sign-in; set ADMIN_PASSWORD to pin it instead.\n",
    );
  }
}

seedDefaultAdmin();
