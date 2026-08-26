import { db, hashPassword, type Role, type UserRow } from "@/lib/db";

export interface UserSummary {
  id: number;
  username: string;
  role: Role;
  created_at: string;
}

export function listUsers(): UserSummary[] {
  return db.prepare("SELECT id, username, role, created_at FROM users ORDER BY username").all() as UserSummary[];
}

export function getUserById(id: number): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

function countAdmins(): number {
  const { count } = db.prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'").get() as {
    count: number;
  };
  return count;
}

export type UserResult = { ok: true } | { ok: false; error: string };

export function createUser(rawUsername: string, password: string, role: Role): UserResult {
  const username = rawUsername.trim();
  if (username.length < 1 || username.length > 50) {
    return { ok: false, error: "Nazwa użytkownika musi mieć od 1 do 50 znaków." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Hasło musi mieć co najmniej 8 znaków." };
  }

  try {
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)").run(
      username,
      hashPassword(password),
      role,
    );
    return { ok: true };
  } catch {
    return { ok: false, error: `Użytkownik „${username}” już istnieje.` };
  }
}

// The last admin can't be demoted — otherwise nobody would be left who can manage accounts.
export function updateUserRole(id: number, role: Role): UserResult {
  const target = getUserById(id);
  if (!target) return { ok: false, error: "Nie znaleziono użytkownika." };
  if (target.role === "admin" && role !== "admin" && countAdmins() <= 1) {
    return { ok: false, error: "Nie można odebrać uprawnień ostatniemu administratorowi." };
  }

  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
  return { ok: true };
}

export function resetPassword(id: number, password: string): UserResult {
  if (password.length < 8) {
    return { ok: false, error: "Hasło musi mieć co najmniej 8 znaków." };
  }

  const result = db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), id);
  if (result.changes === 0) return { ok: false, error: "Nie znaleziono użytkownika." };
  return { ok: true };
}

// Sessions cascade-delete with the user (see schema), so a deleted account is logged out immediately.
export function deleteUser(id: number): UserResult {
  const target = getUserById(id);
  if (!target) return { ok: false, error: "Nie znaleziono użytkownika." };
  if (target.role === "admin" && countAdmins() <= 1) {
    return { ok: false, error: "Nie można usunąć ostatniego administratora." };
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(id);
  return { ok: true };
}
