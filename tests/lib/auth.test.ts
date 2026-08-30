import type { AstroCookies } from "astro";
import { beforeEach, describe, expect, it } from "vitest";
import { getSessionUser, signIn, signOut, SESSION_COOKIE } from "@/lib/auth";
import { db } from "@/lib/db";

beforeEach(() => {
  db.exec("DELETE FROM sessions");
});

function fakeCookies(initial?: string): AstroCookies {
  const store = new Map<string, string>();
  if (initial !== undefined) store.set(SESSION_COOKIE, initial);

  return {
    get: (name: string) => {
      const value = store.get(name);
      return value === undefined ? undefined : { value };
    },
    set: (name: string, value: string) => {
      store.set(name, value);
    },
    delete: (name: string) => {
      store.delete(name);
    },
  } as unknown as AstroCookies;
}

function mustSignIn(username: string, password: string) {
  const result = signIn(username, password);
  if (!result) throw new Error("expected signIn to succeed in test setup");
  return result;
}

describe("signIn", () => {
  it("returns a session user + token for correct credentials", () => {
    const result = signIn("admin", "test-password-123");
    expect(result).not.toBeNull();
    expect(result?.username).toBe("admin");
    expect(result?.role).toBe("admin");
    expect(typeof result?.token).toBe("string");
  });

  it("returns null for a wrong password", () => {
    expect(signIn("admin", "wrong-password")).toBeNull();
  });

  it("returns null for an unknown username", () => {
    expect(signIn("nobody", "whatever")).toBeNull();
  });
});

describe("getSessionUser", () => {
  it("returns null when there is no session cookie", () => {
    expect(getSessionUser(fakeCookies())).toBeNull();
  });

  it("returns null for an unknown token", () => {
    expect(getSessionUser(fakeCookies("not-a-real-token"))).toBeNull();
  });

  it("resolves the user for a valid session token", () => {
    const signed = mustSignIn("admin", "test-password-123");
    const user = getSessionUser(fakeCookies(signed.token));
    expect(user?.username).toBe("admin");
  });

  it("returns null and deletes the row once the session has expired", () => {
    const signed = mustSignIn("admin", "test-password-123");
    db.prepare("UPDATE sessions SET expires_at = ? WHERE token = ?").run(
      new Date(Date.now() - 1000).toISOString(),
      signed.token,
    );

    expect(getSessionUser(fakeCookies(signed.token))).toBeNull();
    const remaining = db.prepare("SELECT * FROM sessions WHERE token = ?").get(signed.token);
    expect(remaining).toBeUndefined();
  });
});

describe("signOut", () => {
  it("removes the session row so the token no longer resolves", () => {
    const signed = mustSignIn("admin", "test-password-123");
    const cookies = fakeCookies(signed.token);

    signOut(cookies);

    expect(getSessionUser(cookies)).toBeNull();
    const remaining = db.prepare("SELECT * FROM sessions WHERE token = ?").get(signed.token);
    expect(remaining).toBeUndefined();
  });
});
