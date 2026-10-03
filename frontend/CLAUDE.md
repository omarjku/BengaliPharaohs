@AGENTS.md

# Frontend (owner: Zoha)
- All backend calls go through `src/lib/api.ts`; the shape comes from `../contract/api.md`.
- Styling: Tailwind v4 utilities. Components: shadcn/ui (`npx shadcn@latest add <name>` after `init`).
- Motion: import from `motion/react`. Animate entrances and layout changes only; respect `prefers-reduced-motion` via `MotionConfig reducedMotion="user"`.
- Streaming tokens: batch state updates if rendering gets slow (more than a few hundred tokens).
- Before committing: `npx tsc --noEmit && npm run build` (or `make smoke` from the root).
