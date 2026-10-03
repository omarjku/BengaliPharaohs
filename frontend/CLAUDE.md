@AGENTS.md

# Frontend (owner: Zoha)

## Rules
- Use only **Next.js** (App Router), **Tailwind v4**, **shadcn/ui** and **Motion for React** (`motion/react`). No other UI, styling, animation or data-fetching libraries.
- Add `"use client"` at the top of any file that uses state, effects, event handlers, browser APIs or Motion. Keep pages as Server Components where possible and import client components into them (see `src/app/demo/`).
- Commit often: after each small piece works, run `npm run build`, then commit. Never commit a red build.

## How things work here
- All backend calls go through `src/lib/api.ts`; the shape comes from `../contract/api.md`.
- Styling: Tailwind v4 utilities and the shadcn theme tokens in `src/app/globals.css` (`bg-background`, `text-muted-foreground`, …). Dark mode is the `.dark` class, set from the OS by `next-themes`.
- Components: shadcn/ui, style `base-nova`, built on **Base UI** (not Radix). Add more with `npx shadcn@latest add <name>`. To render a trigger as another component use `render={<Button />}`, not `asChild`.
- Toasts: `toast()` from `sonner`; the `<Toaster />` is already in `layout.tsx`.
- Motion: animate entrances and layout changes only; wrap screens in `MotionConfig reducedMotion="user"`. Patterns for `animate`, `AnimatePresence` and `layout` are in `src/app/demo/motion-demo.tsx`.
- Fetching: one state value (`loading | error | success`) per request, with a skeleton, an error message with retry, and an AbortController. Pattern in `src/app/demo/fetch-demo.tsx`.
- Streaming tokens: batch state updates if rendering gets slow (more than a few hundred tokens).
- Before committing: `npx tsc --noEmit && npm run build` (or `make smoke` from the root).
