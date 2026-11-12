# motivators-board

[![npm version](https://img.shields.io/npm/v/motivators-board.svg)](https://www.npmjs.com/package/motivators-board)
[![CI](https://github.com/asiermarques/motivators-board/actions/workflows/ci.yml/badge.svg)](https://github.com/asiermarques/motivators-board/actions/workflows/ci.yml)
[![Node](https://img.shields.io/node/v/motivators-board.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A game-like board to talk about what motivates a person. They rank every motivator card from least to most important,
mark which ones are met or unmet in their life right now, and keep or send the result as a link.

Inspired by [Moving Motivators](https://management30.com/practice/moving-motivators/) from Management 3.0.

## Features

- **Rank by dragging**: move the cards with the mouse, touch or the keyboard. The order is strict, with no ties.
- **Met and unmet**: slide a card to the right (met) or to the left (unmet) to show whether it is fulfilled today.
- **Flip a card** to read its description.
- **No backend**: the whole board lives in the URL fragment, so a link is a snapshot you can bookmark or send.
- **Yours to configure**: your own motivators, icons, colours, texts, logo, footer and theme, checked before every
  build.
- **Static output**: `npm run build` writes plain files with relative paths that you can deploy anywhere.

## Quick start

Create a repository for your board and install motivators-board in it:

```sh
npm init -y
npm install motivators-board
npx motivators-board init   # copies the sample configuration to config/ and adds the npm scripts
npm run dev                 # the board with your configuration; it reloads when config/ changes
```

When it looks right:

```sh
npm run check               # lists every problem of the configuration
npm run build               # static files in dist/, ready to deploy
npm run preview             # serves dist/ locally
```

`dev` and `preview` take `--host`, `--port` and `--open`, as Vite does.

### Deploy to Netlify

Copy [`netlify.toml`](netlify.toml) and [`.nvmrc`](.nvmrc) to the root of your repository and import it in Netlify. It
builds with `npm run build`, publishes `dist/`, and caches the hashed files in `dist/assets/` forever. Any other static
host works too: upload `dist/`.

## Configuration

Everything that makes the board yours lives in `config/`. Any file you do not add is read from the sample
configuration.

| file                   | what it holds                                                                     |
| ---------------------- | --------------------------------------------------------------------------------- |
| `settings.yml`         | the title, the logo, the footer (Markdown) and the locale                         |
| `motivators/<key>.md`  | one file per motivator: its icon, colour, title and description                   |
| `i18n/<locale>.yml`    | overrides of the UI strings                                                       |
| `theme.css`            | CSS loaded after the base styles                                                  |
| images                 | the svg, png, jpg, jpeg, webp or gif files that the settings and motivators use   |

A motivator file is named after its key (`[a-z0-9-]+`), which is what the share link uses:

```md
---
icon: autonomy.svg
colour: "#6b4fa0"
title: Autonomy
---

Freedom to make decisions about your work.
```

Once `config/motivators/` exists it is the whole set: the sample motivators are not added to it. To read the
configuration from another folder, set `MOTIVATORS_BOARD_CONFIG_DIR`. See [`config/README.md`](config/README.md) for
the details.

## The share link

```
#name=Ana&lang=en&met=craft&unmet=money&order=money,impact,craft,…
```

- `order` lists the motivator keys from least to most important.
- `met` and `unmet` list the motivators whose card sits to the right or to the left. Each one is left out when it is
  empty.

Old or hand-edited links always open. Unknown keys and duplicates are dropped, missing motivators are added at the
end, and a notice says what changed.

## Developing motivators-board

Requires Node.js 22.12 or newer (see [`.nvmrc`](.nvmrc)).

```sh
npm install
npm run dev
npm test -- --run && npm run build
```

Before changing anything, read [`docs/PRODUCT.md`](docs/PRODUCT.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
[`docs/DESIGN.md`](docs/DESIGN.md) and the [ADRs](docs/adr/). Pushing a `vX.Y.Z` tag that matches `package.json`
publishes the package to npm.

## License

[MIT](LICENSE) © Asier Marqués. Made with ☕.

Moving Motivators is a practice of [Management 3.0](https://management30.com/). This project is not affiliated with
it.
