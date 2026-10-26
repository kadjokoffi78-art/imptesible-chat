import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable(
  "chat_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: text("username").notNull(),
    phone: text("phone").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("chat_users_phone_unique").on(table.phone)],
);

export const sessionsTable = pgTable(
  "chat_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("chat_sessions_token_hash_unique").on(table.tokenHash),
    index("chat_sessions_user_id_idx").on(table.userId),
  ],
);

export const contactsTable = pgTable(
  "chat_contacts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    contactUserId: uuid("contact_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.contactUserId] }),
    index("chat_contacts_contact_user_id_idx").on(table.contactUserId),
  ],
);

export const conversationsTable = pgTable("chat_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  pairKey: text("pair_key").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const conversationMembersTable = pgTable(
  "chat_conversation_members",
  {
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.conversationId, table.userId] }),
    index("chat_conversation_members_user_id_idx").on(table.userId),
  ],
);

export const messagesTable = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversationsTable.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("chat_messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);
