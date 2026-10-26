---
name: Orval Zod parameter type collisions
description: Avoid duplicate exported parameter types when generating Zod APIs and separate TypeScript schemas.
---

When Orval's Zod client output and its separate `schemas` TypeScript output are both barrel-exported, operation parameter types can be emitted twice under the same name (for example, a query parameter type in both `generated/api.ts` and `generated/types/`). This breaks the workspace library typecheck.

**Why:** Orval derives parameter type names from operation IDs and exposes them in both outputs; the generated barrel then creates duplicate exports.

**How to apply:** If codegen reports TS2308 for a generated parameter type, remove the separate `schemas` TypeScript output when the server only needs the Zod request/response schemas. Keep the Zod API output and regenerate.
