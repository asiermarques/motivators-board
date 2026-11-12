# Architecture

motivators-board is a static, single-page app. There is no backend, no database and no router: the configuration is
compiled into the bundle at build time and the person's board lives in the URL. It follows the architecture ([ADR 0004](adr/0004-stack-and-copy-adapt-from-progression-radar.md)).

> Status: the first release (1.0.0) is implemented: the Board, the Share link, the Configuration with `check`, and the
> `dev`, `build`, `preview`, `check` and `init` commands, in a single Locale. 1.1.0 adds Fulfilment (Met, Unmet) and is the first version on npm. Snapshots, Reports, several Locales with
> a selector, sounds and the celebration are not implemented yet; the parts of this document about them describe the
> target design.

## Goals

- **Playful, but the domain stays plain.** The game feel (drag and drop, animations, sounds) is rich, but ordering,
  normalisation and the URL state are pure TypeScript that never imports a UI or effects library.
- **Customisable without touching `src/`.** Adopters change files in their own config folder only (`config/`,
  git-ignored upstream, overrides the sample in `config.example/` file by file), ideally from an Adopter repository.
- **Accessible.** Every interaction works with the keyboard and with touch; motion respects `prefers-reduced-motion`.
- **Deployable anywhere.** `npm run build` produces plain static files with relative paths.

## Stack

| concern       | choice                               | why                                                               |
| ------------- | ------------------------------------ | ----------------------------------------------------------------- |
| build         | Vite                                 | fast dev server, zero-config production build; same as the radar  |
| UI            | React + TypeScript                   | small component tree, typed domain model                          |
| state         | React `useState` in `App`            | one object (`Person`) is the whole state; no store library needed |
| drag and drop | dnd-kit (`@dnd-kit/core` + sortable) | mouse and touch sensors, screen-reader announcements              |
| animation     | Web Animations API and CSS           | the opening deal, cards sliding after a keyboard Move, the flip, the Summary; motion later  |
| sound         | Web Audio API                        | a few short sounds, no library; off by default                    |
| i18n          | i18next + react-i18next              | UI strings per locale, plurals, adopter overrides                 |
| styles        | plain CSS with custom properties     | theming from the adopter's `theme.css`, no CSS framework          |
| markdown      | react-markdown                       | renders motivator descriptions safely (no raw HTML)               |
| config        | YAML and Markdown read at build time | readable for non-developers, no runtime fetch                     |
| tests         | Vitest + Testing Library (happy-dom) | shares the Vite config                                            |

Check the current APIs of dnd-kit, motion and i18next before implementing; do not add other runtime dependencies
without asking.

- dnd-kit is the stable `@dnd-kit/core` 6 and `@dnd-kit/sortable` 10, not the newer `@dnd-kit/react` (still 0.x). It
  handles drags only: a mouse drag starts after 6 px, so a click still flips the Card, and a touch drag after a short
  press, so a swipe still scrolls. Keyboard Moves are the Board's own: up and down move the focused Card one Position
  (up towards the most important), Home and End send it to an end, Enter flips it. Right and left do not move the
  Position: they slide the Card one place towards Met or Unmet (`stepFulfilment` in `model.ts`). Every Move and every
  Fulfilment change, dragged or not, is announced in one live region.
- The same drag also sets the Fulfilment. The dragged Card follows the pointer sideways (dnd-kit's own transform, no
  modifier); on drop, `onDragEnd` reads the horizontal `delta` and `sidewaysDrop` in `model.ts` turns it into a place,
  only for a clear sideways intent (half the distance between two places, never less than 16px), so the wobble of a
  vertical Move changes nothing. The distance between places is measured from the column and the Card, so the Adopter's
  `--fulfilment-offset` is respected.
- The Board is always one column, the most important on top. The Fulfilment is a sideways offset of the Card within it
  (margins set by `data-fulfilment` in `styles.css`), not a lane or a drop zone. It is `column-reverse`: the DOM, and so the reading and
  focus order, stays from least to most important; only dnd-kit gets the Cards in the order they are seen, with the
  vertical sorting strategy.
- motion is not used yet: a keyboard Move and a Fulfilment change (keyboard or drop) slide the Cards with the Web
  Animations API (`effects/moveAnimation.ts`), a vertical drag needs no help, and the flip is a CSS animation. It stays the choice for the celebration.

## Layout

```
config.example/          upstream's sample configuration and the defaults (adopters do not edit it)
  settings.yml             title, logo, footer and the Locale (the Default locale)
  motivators/<key>.md      one Markdown motivator file per motivator: icon, colour, title and description
  i18n/<locale>.yml        optional overrides of UI strings for a locale (none in the sample)
  theme.css                comment-only CSS overrides, loaded after the base styles
config/                  the adopter's configuration; git-ignored except README.md; each file replaces the sample one,
                         and its motivators/ folder, when there is one, is the whole set of Motivators
                         (MOTIVATORS_BOARD_CONFIG_DIR names another folder)
public/                  static files copied as-is (favicons, manifest, sound files if not synthesised)
docs/                    PRODUCT, ARCHITECTURE, DESIGN, the glossary, the ADRs and guides/
scripts/                 copied and adapted from progression-radar
  cli.mjs                  the `motivators-board` binary: dev, build, preview, check, init (snapshot … later)
  config-sources.ts        decides which folder each configuration file is read from; writes the virtual modules
  motivator-markdown.ts    reads one motivator file into the raw shape of a motivator
  check-command.ts         `check` (the configuration; the snapshots later), also run before `build`
  init.ts                  `init`: copies the sample to config/, adds the npm scripts and the dependency
  snapshots.ts             records a Person in a CSV snapshot, turns a row into a share link, checks snapshots
  report.ts                the data of a Report (pure): per-person moves and team aggregates
  report-html.tsx          renders a Report as one self-contained HTML page (no script, CSP `<meta>`)
  csv.ts                   CSV reader and writer
snapshots/               the user's snapshots (personal data); git-ignored except README.md
reports/                 the Reports `snapshot:report` writes (personal data); git-ignored, never served
src/
  main.tsx                 entry point: loads config, i18n and theme, reads the URL, renders App or an error screen
  App.tsx                  owns the state, syncs it to the URL, composes the page
  model.ts                 domain types and pure functions: normalising an order and a Fulfilment, moving a card,
                           stepping and dropping a Fulfilment, rank distances
  config.ts                validates the resolved configuration into a typed Config
  urlState.ts              reads and writes the share link (URL fragment) and its notices
  strings.ts               the UI strings shipped with the app (no i18n library: `check` uses it too)
  i18n.ts                  builds the i18next instance from the Config's UI strings
  effects/                 the only place for animations and, later, motion and Web Audio: card moves, sounds
  components/
    Board.tsx              the sortable column of cards (dnd-kit), keyboard Moves and the live region
    MotivatorCard.tsx      a card: icon, title, flip to the description, its sideways place and Fulfilment mark
    FulfilmentMark.tsx     the Met or Unmet symbol with its accessible text, on the Card and in the Summary
    Summary.tsx            the most and least motivating Motivators, derived from the Order, with their Fulfilment
    PersonPanel.tsx        name and the copy-link button (the locale selector comes with several Locales)
    LinkNotice.tsx         dismissible notice about data a link could not use
  styles.css               base styles and the CSS custom properties used for theming (see DESIGN.md)
  fonts/                   Shippori Mincho and Zen Kaku Gothic New, woff2 with their OFL licences: no third-party font requests
  *.test.ts(x)             tests, next to the code they cover
```

## Data flow

1. At build time, the Vite plugin resolves each configuration file from the config folder or `config.example/` and
   exposes it as a virtual module; `config.ts` validates it into a typed `Config` (motivators in configuration order,
   locales, settings). An invalid configuration renders the list of problems in dev and fails `check` and `build`.
   The UI strings are part of the `Config`: the shipped ones (`strings.ts`) with the adopter's overrides; a Locale
   that is not shipped must translate them all.
2. `main.tsx` reads the fragment with `urlState.ts`, which returns a normalised `Person`, whether the Board was dealt,
   and the notice to show.
3. `App.tsx` holds the `Person`. A Move calls `moveCard` in `model.ts`, which returns a new order, and a Fulfilment
   change calls `setFulfilment`; either one on a dealt Board makes `order` written too; `App` writes the
   fragment with `history.replaceState`, 250 ms after the last change (and on `pagehide`), never on load, and listens
   to `hashchange` for hand edits.
4. `effects/` reacts to Moves and Fulfilment changes to animate; the domain never waits for or depends on an effect.

## The share link

The format is fixed by [ADR 0001](adr/0001-strict-order-share-url-in-the-fragment.md) and
[ADR 0003](adr/0003-configured-locales-with-lang-in-the-share-url.md):

```
#name=Ana+L%C3%B3pez&lang=es&met=cur,acc&unmet=pow&order=fre,cur,mas,rel,goa,hon,acc,ord,pow,sta
```

- Parsed with `URLSearchParams`; `name` is left out when empty, `lang` is always written, `met` and `unmet` follow
  (each left out when empty) and `order` is written last, all with their commas as they are (keys never need
  escaping).
- Parameters other than `name`, `lang`, `met`, `unmet` and `order` are ignored and named in the Link notice.
- `met` and `unmet` list the Motivators whose Card is to the right and to the left, in the Order (least to most
  important), so the same Board always gives the same link. Normalisation drops unknown keys and duplicates, and a key
  listed in both from both; the Link notice names them. They apply to a dealt Board too.
- `order` lists motivator keys from least to most important. Normalisation: drop unknown keys and duplicates (first
  occurrence wins), append missing configured motivators at the end in configuration order.
- Without `order`, the board is dealt in a random order and `order` is written on the first Move or Fulfilment change.
- `lang` outside the declared locales falls back to the default locale; without `lang`, the default locale is used.
- `name`, `lang`, `met`, `unmet` and `order` are reserved (`RESERVED_PARAMETERS` in `model.ts`) and cannot be motivator keys; motivator keys must match `[a-z0-9-]+`, so
  the comma never needs escaping.
- The share link format is part of the public contract.

## Motivator files and locales

One file per motivator; the file name is the motivator key. The first release declares a single Locale in
`settings.yml` (`locale: en`), so a motivator file is flat: the frontmatter holds the icon (an image file of the config
folder), the colour and the Title, and the body is the Description in Markdown.

```md
---
icon: discovery.svg
colour: "#2f7d6d"
title: Discovery
---

Exploring ideas I do not know yet and finding out how things work.
```

Several Locales per motivator file, as [ADR 0003](adr/0003-configured-locales-with-lang-in-the-share-url.md) decides,
will change this format, which is part of the public contract: a major version.

`check` fails, listing every problem, when a motivator file lacks its icon, colour, Title or Description, when its
key is outside `[a-z0-9-]+` or is a reserved parameter, when an image is missing, when a UI string is missing for a
Locale that is not shipped, or when `i18n/` has a file for a Locale that `settings.yml` does not declare.

## Snapshots and Reports

Snapshots are CSV files that the app never reads
([ADR 0002](adr/0002-evolution-and-team-views-from-local-snapshots.md)). The `snapshot` commands reuse the app's code
instead of copying its rules: `urlState.ts` to read and write share links, `config.ts` for the configuration and
`model.ts` for normalisation and rank distances. As in the radar, they are loaded through Vite's `runnerImport` with
the configuration plugin, so the virtual configuration module resolves with no build step.

- A snapshot is history: the tools only add rows, never rewrite one, and refuse a repeated `id`.
- Reports are HTML with no JavaScript and a restrictive CSP `<meta>`. The per-person Report shows the moves of each
  motivator between snapshots and a global change indicator (Kendall tau distance between orders); the team Report
  shows the average position and the dispersion of each motivator at each person's latest row.
- The dev server never serves the Snapshots folder or `reports/`.

## Security notes

- The person's data stays in the URL fragment, which browsers do not send to the server.
- Names written to CSV are neutralised when they start with `=`, `+`, `-` or `@`, so spreadsheets do not run them as
  formulas.
- Names and configuration texts are always escaped in Reports; Markdown is rendered without raw HTML, in the app and in
  Reports.

## Copied from progression-radar

The modules below start as copies of progression-radar 1.3.0. Fixes made there do not reach this project
automatically; when one matters, port it and update the version here.

| module here                              | from progression-radar                   | version |
| ---------------------------------------- | ---------------------------------------- | ------- |
| `scripts/cli.mjs`                        | `scripts/cli.mjs`                        | 1.3.0   |
| `scripts/config-sources.ts`              | `scripts/config-sources.ts`              | 1.3.0   |
| `scripts/motivator-markdown.ts`          | `scripts/category-markdown.ts`           | 1.3.0   |
| `scripts/check-command.ts`               | `scripts/check-command.ts`               | 1.3.0   |
| `scripts/init.ts`                        | `scripts/init.ts`                        | 1.3.0   |
| `src/config.ts`                          | `src/config.ts`                          | 1.3.0   |
| `src/urlState.ts` (notices, parsing)     | `src/urlState.ts`                        | 1.3.0   |

Not copied yet: `scripts/snapshots.ts`, `scripts/csv.ts` and `scripts/report-html.tsx`, which come with Snapshots.

## Releases and versioning

Published to npm, like the radar: `version` in `package.json` is the published one and publishing is pushing a
`vX.Y.Z` tag that matches it. Every change that reaches adopters bumps `version` by semver on the public contract (the
commands and npm script names, the configuration files, the share link format and the snapshot format; `src/` is not
part of it).

The package ships sources, not a bundle, because the configuration is compiled in at build time: `files` lists
`index.html`, `vite.config.ts`, `tsconfig.json`, `src/`, `scripts/`, `config.example/`, `config/README.md` (copied by
`init`) and `public/`, without the tests.

- `.github/workflows/ci.yml` runs `check`, the tests and the build, and an adopter job that packs the package,
  installs it in an empty folder, runs `init` and then `check` and `build` there.
- `.github/workflows/release.yml` runs on a `vX.Y.Z` tag: the CI jobs, a check that the tag matches `version`, then
  `npm publish` with npm trusted publishing. npmjs.com trusts that workflow file through OIDC (configured once in the
  package settings), so no token is stored and the provenance is generated automatically.

```sh
git tag v1.1.0 && git push origin v1.1.0
```

## Open questions

- Snapshot columns: the share link as one column, as ADR 0002 words it, or one column per motivator with its position.
  One column per motivator is easier to read and edit in a spreadsheet and makes "not recorded" explicit for
  motivators added later; if chosen, ADR 0002 should be amended.
