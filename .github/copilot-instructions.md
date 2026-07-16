# GitHub Copilot Instructions for TravelTogether

TravelTogether is a Next.js App Router + Supabase app for collaborative travel planning.

Before making substantial changes, read:
- `AGENTS.md`
- `docs/PRODUCT_CONTEXT.md`
- `docs/ARCHITECTURE.md`

Repository expectations:
- Preserve the no-Supabase scaffold mode.
- Prefer minimal, compatible changes over large rewrites.
- Keep Supabase schema changes synchronized with API routes and UI usage.
- Be aware that many reads allow shared/public access, but most write endpoints still require trip ownership.
- The visible app version is a manual label in `app/layout.tsx`, not the `package.json` version.
