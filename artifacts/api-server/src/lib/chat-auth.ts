import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, sessionsTable } from "@workspace/db";

const SESSION_DAYS = 30;

export function normalizePhone(value: string): string | null {
  let compact = value.trim().replace(/[\s().-]/g, "");
  if (compact.startsWith("00")) compact = `+${compact.slice(2)}`;

  // Côte d'Ivoire's 10-digit local format is also accepted without +225.
  if (/^0\d{9}$/.test(compact)) compact = `+225${compact}`;
  else if (/^\d{8,15}$/.test(compact)) compact = `+${compact}`;

  return /^\+[1-9]\d{7,14}$/.test(compact) ? compact : null;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, saltText, hashText] = storedHash.split("$");
  if (algorithm !== "scrypt" || !saltText || !hashText) return false;

  try {
    const expected = Buffer.from(hashText, "base64url");
    const actual = scryptSync(password, Buffer.from(saltText, "base64url"), 64);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({
    userId,
    tokenHash: hashSessionToken(token),
    expiresAt,
  });
  return token;
}

export const requireUser: RequestHandler = async (req, res, next) => {
  const authorization = req.header("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    res.status(401).json({ error: "Connectez-vous pour continuer." });
    return;
  }

  const [session] = await db
    .select({ userId: sessionsTable.userId })
    .from(sessionsTable)
    .where(
      and(
        eq(sessionsTable.tokenHash, hashSessionToken(match[1])),
        gt(sessionsTable.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!session) {
    res.status(401).json({ error: "Votre session a expiré. Reconnectez-vous." });
    return;
  }

  res.locals.userId = session.userId;
  next();
};

const attemptBuckets = new Map<string, { count: number; resetAt: number }>();

export const limitAuthAttempts: RequestHandler = (req, res, next) => {
  const key = req.ip || "unknown";
  const now = Date.now();
  const bucket = attemptBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    attemptBuckets.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    next();
    return;
  }

  if (bucket.count >= 12) {
    res.status(429).json({
      error: "Trop de tentatives. Réessayez dans quelques minutes.",
    });
    return;
  }

  bucket.count += 1;
  next();
};
