import { Router, type IRouter, type Request } from "express";
import { and, asc, desc, eq, gt, ne } from "drizzle-orm";
import {
  AddContactBody,
  LoginBody,
  RegisterBody,
  SearchUserQueryParams,
  SendMessageBody,
} from "@workspace/api-zod";
import {
  contactsTable,
  conversationMembersTable,
  conversationsTable,
  db,
  messagesTable,
  sessionsTable,
  usersTable,
} from "@workspace/db";
import {
  createSession,
  hashPassword,
  hashSessionToken,
  limitAuthAttempts,
  normalizePhone,
  requireUser,
  verifyPassword,
} from "../lib/chat-auth";

const router: IRouter = Router();

type AuthenticatedRequest = Request & { userId?: string };

function currentUserId(req: AuthenticatedRequest): string {
  return (req.userId ?? req.res?.locals.userId) as string;
}

function publicUser(user: {
  id: string;
  username: string;
  phone: string;
  createdAt: Date;
}) {
  return {
    id: user.id,
    username: user.username,
    phone: user.phone,
    createdAt: user.createdAt.toISOString(),
  };
}

function getPairKey(firstUserId: string, secondUserId: string): string {
  return [firstUserId, secondUserId].sort().join(":");
}

router.post("/auth/register", limitAuthAttempts, async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Vérifiez le nom, le numéro et le mot de passe." });
    return;
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    res.status(400).json({ error: "Saisissez un numéro de téléphone valide." });
    return;
  }

  try {
    const [user] = await db
      .insert(usersTable)
      .values({
        username: parsed.data.username.trim(),
        phone,
        passwordHash: hashPassword(parsed.data.password),
      })
      .returning({
        id: usersTable.id,
        username: usersTable.username,
        phone: usersTable.phone,
        createdAt: usersTable.createdAt,
      });

    if (!user) {
      res.status(500).json({ error: "Le compte n’a pas pu être créé." });
      return;
    }

    const token = await createSession(user.id);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "23505"
    ) {
      res.status(409).json({ error: "Ce numéro est déjà associé à un compte." });
      return;
    }
    throw error;
  }
});

router.post("/auth/login", limitAuthAttempts, async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Saisissez votre numéro et votre mot de passe." });
    return;
  }
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    res.status(401).json({ error: "Numéro ou mot de passe incorrect." });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, phone))
    .limit(1);

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    res.status(401).json({ error: "Numéro ou mot de passe incorrect." });
    return;
  }

  const token = await createSession(user.id);
  res.json({ token, user: publicUser(user) });
});

router.use(requireUser);

router.post("/auth/logout", async (req, res) => {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (token) {
    await db
      .delete(sessionsTable)
      .where(eq(sessionsTable.tokenHash, hashSessionToken(token)));
  }
  res.status(204).end();
});

router.get("/me", async (req, res) => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, currentUserId(req)))
    .limit(1);
  if (!user) {
    res.status(404).json({ error: "Compte introuvable." });
    return;
  }
  res.json(publicUser(user));
});

router.get("/users/search", async (req, res) => {
  const parsed = SearchUserQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Saisissez un numéro de téléphone valide." });
    return;
  }
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    res.status(400).json({ error: "Saisissez un numéro de téléphone valide." });
    return;
  }

  const userId = currentUserId(req);
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, phone))
    .limit(1);

  if (!user || user.id === userId) {
    res.json({ user: null, isContact: false, conversationId: null });
    return;
  }

  const pairKey = getPairKey(userId, user.id);
  const [contact] = await db
    .select({ userId: contactsTable.userId })
    .from(contactsTable)
    .where(
      and(
        eq(contactsTable.userId, userId),
        eq(contactsTable.contactUserId, user.id),
      ),
    )
    .limit(1);
  const [conversation] = await db
    .select({ id: conversationsTable.id })
    .from(conversationsTable)
    .where(eq(conversationsTable.pairKey, pairKey))
    .limit(1);

  res.json({
    user: publicUser(user),
    isContact: Boolean(contact),
    conversationId: conversation?.id ?? null,
  });
});

router.get("/contacts", async (req, res) => {
  const userId = currentUserId(req);
  const contacts = await db
    .select({
      contactUserId: contactsTable.contactUserId,
      addedAt: contactsTable.createdAt,
      id: usersTable.id,
      username: usersTable.username,
      phone: usersTable.phone,
      createdAt: usersTable.createdAt,
    })
    .from(contactsTable)
    .innerJoin(usersTable, eq(usersTable.id, contactsTable.contactUserId))
    .where(eq(contactsTable.userId, userId))
    .orderBy(asc(usersTable.username));

  const result = await Promise.all(
    contacts.map(async (contact) => {
      const [conversation] = await db
        .select({ id: conversationsTable.id })
        .from(conversationsTable)
        .where(eq(conversationsTable.pairKey, getPairKey(userId, contact.id)))
        .limit(1);
      return {
        user: publicUser(contact),
        conversationId: conversation?.id ?? "",
        addedAt: contact.addedAt.toISOString(),
      };
    }),
  );

  res.json(result.filter((contact) => contact.conversationId));
});

router.post("/contacts", async (req, res) => {
  const parsed = AddContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Saisissez un numéro de téléphone valide." });
    return;
  }

  const userId = currentUserId(req);
  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    res.status(400).json({ error: "Saisissez un numéro de téléphone valide." });
    return;
  }

  const [peer] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, phone))
    .limit(1);
  if (!peer) {
    res.status(404).json({ error: "Aucun utilisateur trouvé avec ce numéro." });
    return;
  }
  if (peer.id === userId) {
    res.status(400).json({ error: "Vous ne pouvez pas vous ajouter vous-même." });
    return;
  }

  const pairKey = getPairKey(userId, peer.id);
  const created = await db.transaction(async (tx) => {
    const [existingContact] = await tx
      .select({ createdAt: contactsTable.createdAt })
      .from(contactsTable)
      .where(
        and(
          eq(contactsTable.userId, userId),
          eq(contactsTable.contactUserId, peer.id),
        ),
      )
      .limit(1);

    await tx
      .insert(contactsTable)
      .values({ userId, contactUserId: peer.id })
      .onConflictDoNothing();

    await tx
      .insert(conversationsTable)
      .values({ pairKey })
      .onConflictDoNothing({ target: conversationsTable.pairKey });

    const [conversation] = await tx
      .select({ id: conversationsTable.id, createdAt: conversationsTable.createdAt })
      .from(conversationsTable)
      .where(eq(conversationsTable.pairKey, pairKey))
      .limit(1);
    if (!conversation) throw new Error("Conversation introuvable après création.");

    await tx
      .insert(conversationMembersTable)
      .values([
        { conversationId: conversation.id, userId },
        { conversationId: conversation.id, userId: peer.id },
      ])
      .onConflictDoNothing();

    return {
      conversationId: conversation.id,
      addedAt: existingContact?.createdAt ?? new Date(),
    };
  });

  res.status(201).json({
    user: publicUser(peer),
    conversationId: created.conversationId,
    addedAt: created.addedAt.toISOString(),
  });
});

router.delete("/contacts/:userId", async (req, res) => {
  await db
    .delete(contactsTable)
    .where(
      and(
        eq(contactsTable.userId, currentUserId(req)),
        eq(contactsTable.contactUserId, req.params.userId),
      ),
    );
  res.status(204).end();
});

router.get("/conversations", async (req, res) => {
  const userId = currentUserId(req);
  const memberships = await db
    .select({ conversationId: conversationMembersTable.conversationId })
    .from(conversationMembersTable)
    .where(eq(conversationMembersTable.userId, userId));

  const conversations = await Promise.all(
    memberships.map(async ({ conversationId }) => {
      const [conversation] = await db
        .select()
        .from(conversationsTable)
        .where(eq(conversationsTable.id, conversationId))
        .limit(1);
      const [peer] = await db
        .select({
          id: usersTable.id,
          username: usersTable.username,
          phone: usersTable.phone,
          createdAt: usersTable.createdAt,
        })
        .from(conversationMembersTable)
        .innerJoin(usersTable, eq(usersTable.id, conversationMembersTable.userId))
        .where(
          and(
            eq(conversationMembersTable.conversationId, conversationId),
            ne(conversationMembersTable.userId, userId),
          ),
        )
        .limit(1);
      const [lastMessage] = await db
        .select({
          content: messagesTable.content,
          createdAt: messagesTable.createdAt,
        })
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conversationId))
        .orderBy(desc(messagesTable.createdAt))
        .limit(1);

      if (!conversation || !peer) return null;
      return {
        id: conversation.id,
        peer: publicUser(peer),
        createdAt: conversation.createdAt.toISOString(),
        lastMessage: lastMessage?.content ?? null,
        lastMessageAt: lastMessage?.createdAt.toISOString() ?? null,
      };
    }),
  );

  res.json(
    conversations
      .filter((conversation): conversation is NonNullable<typeof conversation> =>
        Boolean(conversation),
      )
      .sort((first, second) => {
        const firstTime = first.lastMessageAt ?? first.createdAt;
        const secondTime = second.lastMessageAt ?? second.createdAt;
        return secondTime.localeCompare(firstTime);
      }),
  );
});

router.get("/conversations/:conversationId/messages", async (req, res) => {
  const userId = currentUserId(req);
  const conversationId = req.params.conversationId;
  const [membership] = await db
    .select({ conversationId: conversationMembersTable.conversationId })
    .from(conversationMembersTable)
    .where(
      and(
        eq(conversationMembersTable.conversationId, conversationId),
        eq(conversationMembersTable.userId, userId),
      ),
    )
    .limit(1);
  if (!membership) {
    res.status(404).json({ error: "Conversation introuvable." });
    return;
  }

  const after = typeof req.query.after === "string" ? new Date(req.query.after) : null;
  if (after && Number.isNaN(after.getTime())) {
    res.status(400).json({ error: "La date de reprise n’est pas valide." });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(
      after
        ? and(
            eq(messagesTable.conversationId, conversationId),
            gt(messagesTable.createdAt, after),
          )
        : eq(messagesTable.conversationId, conversationId),
    )
    .orderBy(asc(messagesTable.createdAt))
    .limit(500);

  res.json(
    messages.map((message) => ({
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    })),
  );
});

router.post("/conversations/:conversationId/messages", async (req, res) => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.content.trim()) {
    res.status(400).json({ error: "Écrivez un message avant de l’envoyer." });
    return;
  }

  const userId = currentUserId(req);
  const conversationId = req.params.conversationId;
  const [membership] = await db
    .select({ conversationId: conversationMembersTable.conversationId })
    .from(conversationMembersTable)
    .where(
      and(
        eq(conversationMembersTable.conversationId, conversationId),
        eq(conversationMembersTable.userId, userId),
      ),
    )
    .limit(1);
  if (!membership) {
    res.status(404).json({ error: "Conversation introuvable." });
    return;
  }

  const [message] = await db
    .insert(messagesTable)
    .values({
      conversationId,
      senderId: userId,
      content: parsed.data.content.trim(),
    })
    .returning();

  if (!message) {
    res.status(500).json({ error: "Le message n’a pas pu être envoyé." });
    return;
  }
  res.status(201).json({
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  });
});

export default router;
