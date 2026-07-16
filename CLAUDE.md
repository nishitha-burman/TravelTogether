# Claude Notes

Use [`AGENTS.md`](AGENTS.md) as the primary starting point.

Then read:
- [`docs/PRODUCT_CONTEXT.md`](docs/PRODUCT_CONTEXT.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

Project-specific cautions:
- Preserve scaffold mode when Supabase is not configured.
- Keep backward-compatible fallbacks for older Supabase schemas unless intentionally removing that support.
- Most write APIs are owner-only today, even though the product already models shared members.
