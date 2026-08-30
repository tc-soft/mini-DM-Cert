import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createUser, deleteUser, listUsers, resetPassword, updateUserRole } from "@/lib/users";

// The seeded default admin (see tests/setup.ts) is always present; delete everyone else and
// restore its role between tests, since some tests demote/delete it, so assertions about
// "the only admin" stay meaningful regardless of test order.
beforeEach(() => {
  db.exec("DELETE FROM users WHERE username != 'admin'");
  db.prepare("UPDATE users SET role = 'admin' WHERE username = 'admin'").run();
});

function mustFindUser(username: string) {
  const user = listUsers().find((u) => u.username === username);
  if (!user) throw new Error(`expected user "${username}" to exist in test setup`);
  return user;
}

describe("createUser", () => {
  it("creates a user with a valid username and password", () => {
    const result = createUser("jan.kowalski", "supersecret", "user");
    expect(result.ok).toBe(true);
    expect(listUsers().some((u) => u.username === "jan.kowalski" && u.role === "user")).toBe(true);
  });

  it("rejects a duplicate username", () => {
    createUser("jan.kowalski", "supersecret", "user");
    const result = createUser("jan.kowalski", "supersecret2", "user");
    expect(result.ok).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = createUser("newuser", "short", "user");
    expect(result.ok).toBe(false);
  });
});

describe("last-admin guardrails", () => {
  it("refuses to demote the last remaining admin", () => {
    const admin = mustFindUser("admin");
    const result = updateUserRole(admin.id, "user");
    expect(result.ok).toBe(false);
  });

  it("allows demoting an admin when another admin still exists", () => {
    createUser("second.admin", "supersecret", "admin");
    const admin = mustFindUser("admin");
    const result = updateUserRole(admin.id, "user");
    expect(result.ok).toBe(true);
  });

  it("refuses to delete the last remaining admin", () => {
    const admin = mustFindUser("admin");
    const result = deleteUser(admin.id);
    expect(result.ok).toBe(false);
  });

  it("allows deleting a non-admin user", () => {
    createUser("temp.user", "supersecret", "user");
    const user = mustFindUser("temp.user");
    const result = deleteUser(user.id);
    expect(result.ok).toBe(true);
    expect(listUsers().some((u) => u.username === "temp.user")).toBe(false);
  });
});

describe("resetPassword", () => {
  it("rejects a password shorter than 8 characters", () => {
    const admin = mustFindUser("admin");
    const result = resetPassword(admin.id, "short");
    expect(result.ok).toBe(false);
  });

  it("accepts a valid new password", () => {
    const admin = mustFindUser("admin");
    const result = resetPassword(admin.id, "brandnewpassword");
    expect(result.ok).toBe(true);
  });
});
