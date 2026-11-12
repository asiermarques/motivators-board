# motivators-board

A game-like board to talk about what motivates a person. They get every motivator card on a board, rank them from
least to most important by dragging them (mouse, touch or keyboard), flip a card to read it, and keep or send the
result as a link. There is no backend: the whole board lives in the URL fragment.

## Use it in your own repository

```sh
npm init -y
npm install motivators-board
npx motivators-board init   # copies the sample configuration to config/ and adds the npm scripts
npm run dev                 # the board with your configuration; it reloads when config/ changes
npm run check               # lists every problem of the configuration
npm run build               # static files in dist/, with relative paths: deploy them anywhere
```

Edit the files in `config/` to make the board yours: `settings.yml` (title, logo, footer, locale), one Markdown file
per motivator in `motivators/`, UI string overrides in `i18n/<locale>.yml`, `theme.css`, and the images they use.
See [`config/README.md`](config/README.md).

## The share link

```
#name=Ana&lang=en&met=craft&unmet=money&order=money,impact,craft,…
```

`order` lists motivator keys from least to most important. `met` and `unmet` (each left out when empty) list the
motivators whose card sits to the right (met) or to the left (unmet). Old or hand-edited links always open: unknown
keys and duplicates are dropped, missing motivators are added at the end, and a notice says what changed.

## Developing motivators-board

```sh
npm install
npm run dev
npm test -- --run && npm run build
```

Read [`docs/PRODUCT.md`](docs/PRODUCT.md), [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md),
[`docs/DESIGN.md`](docs/DESIGN.md) and the [ADRs](docs/adr/) first.

## License

[MIT](LICENSE) © Asier Marqués. Inspired by [Moving Motivators](https://management30.com/practice/moving-motivators/)
from Management 3.0.
