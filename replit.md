# L’Imptébisible1.9Chat

Android-first French-language messaging app. Accounts use a phone number and password without OTP; the first milestone supports registration, sign-in, exact-number discovery, contacts, and persistent private text conversations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/imptesible-chat run dev` — run the Expo mobile app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — PostgreSQL connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/imptesible-chat` — Expo Router mobile client and app identity.
- `artifacts/api-server` — Express API, including account and messaging routes.
- `lib/db/src/schema/chat.ts` — PostgreSQL tables for users, sessions, contacts, conversations, members, and messages.
- `lib/api-spec/openapi.yaml` — source of truth for the typed API client and server request schemas.

## Architecture decisions

- Account creation and sign-in use phone + password directly; do not add OTP or email verification unless the product requirements change.
- Store passwords as scrypt hashes and session tokens as SHA-256 hashes; the mobile client keeps the opaque bearer token in SecureStore.
- Exact phone search and message authorization are enforced by the server. New contacts create a persistent direct conversation.
- The first messaging milestone refreshes messages every three seconds; it does not use WebSockets yet.

## Product

The current mobile milestone includes French sign-in/registration, server-backed conversations, exact phone search, contact add/remove, and private text messages. Media, groups, statuses, push notifications, and audio/video calls remain future milestones and must not be represented as working yet.

## User preferences

- The user wants a real backend and persistent database, no OTP, and no fake users or messages.
- Do not claim a feature works unless it has been tested.

## Gotchas

- Run API code generation after changing `lib/api-spec/openapi.yaml`.
- Push development schema changes with `pnpm --filter @workspace/db run push`; do not use `push-force` without investigating a schema conflict first.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
