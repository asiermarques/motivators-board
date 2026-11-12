---
title: Game-like React stack, copied and adapted from progression-radar, distributed as an npm dependency
status: Accepted
date: 2026-11-11
tags: [technology-choice, distribution, maintainability]
---

# 0004. Game-like React stack, copied and adapted from progression-radar, distributed as an npm dependency

## Context and problem statement

motivators-board follows the same product pattern as progression-radar: a static React + TypeScript (Vite) app, state
in the URL, content configured by the adopter in Markdown (`config.example/` overridden by `config/`), local snapshots,
and distribution as an npm dependency of an adopter repository (progression-radar ADR 0005). Unlike the radar, it
must feel very game-like: cards dragged on a table with touch support, animations and optional sounds, plus a
multilingual interface. We need to decide the runtime dependencies and how to reuse the radar's code.

## Decision drivers

- **Product:** a very playful feel (drag and drop on desktop and touch, card flips and movement animations, optional
  sounds and a small celebration on completion), accessible by keyboard.
- **Maintainability:** a single maintainer; avoid coupling two products' release cycles; keep effects replaceable.
- **Cost:** static hosting only; no backend.

## Considered options

Dependencies:

1. **No new dependencies**: hand-made drag, animations and i18n; more code, touch and accessibility left to us.
2. **Only a drag and drop library**: animations in CSS/WAAPI, home-made i18n dictionary.
3. **Drag and drop, animation and i18n libraries**: dnd-kit, motion and i18next.

Reuse:

1. **Copy and adapt the radar's modules** (config loading, CLI, snapshots, reports, packaging).
2. **Extract a shared npm package now** used by both products.
3. **Move both into a monorepo** with shared packages.

## Decision outcome

Chosen options: **"dnd-kit, motion and i18next"** and **"Copy and adapt"**, because the libraries give accessible
touch drag and drop, rich animation and mature i18n faster than building them, and copying avoids coordinating two
products' versions before a shared abstraction has proven itself (rule of three: extract a package if a third tool
appears).

- Stack: React, TypeScript, Vite; dnd-kit (drag and drop with keyboard and touch sensors), motion (animations),
  i18next (UI strings); sounds with the Web Audio API, off by default; `prefers-reduced-motion` disables
  non-essential animations.
- motion and the sounds sit behind a small internal effects module, so the domain (ordering, URL state) never imports
  them directly.
- Distribution as in progression-radar ADR 0005: published to npm, used as a dependency of an adopter repository that
  holds only `config/` and snapshots; the public contract (commands and npm script names, configuration files, share
  link format, snapshot format) is versioned with semver.

### Consequences

- **Good:** fast path to a polished, accessible game feel; independent evolution of both products; proven
  distribution model.
- **Trade-offs:** three more runtime dependencies to keep updated; fixes in the radar's copied modules (snapshots,
  CLI, config loading) do not reach this project automatically.
- **Follow-ups:** record in `docs/ARCHITECTURE.md` which progression-radar version each copied module comes from;
  check current dnd-kit, motion and i18next APIs before implementing.

## Links

- progression-radar ADR 0005 (radar as a dependency of an adopter repository).
- ADR 0002 (snapshots), ADR 0003 (i18n).
