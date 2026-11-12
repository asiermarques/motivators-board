# Design

motivators-board looks **calm and Japanese-inspired**: washi paper, sumi ink and a single vermilion accent, the colour
of a seal. The Board is a column of paper slips on a quiet plot of raked sand, the most important on top, and the
Summary beside it stamps the three most motivating with a numbered seal. It should feel like a moment of reflection with
someone, not like filling in a survey, and not like a casino either. The Cards and their words come first, and nothing
tells a Person they are winning or losing.

The base styles are in [`src/styles.css`](../src/styles.css). Adopters restyle the Board from their `theme.css`
through the custom properties below, without touching `src/`.

## Principles

1. **Ma: the space is part of the design.** Generous margins, hairlines instead of boxes, no ornament that does not
   carry meaning. When in doubt, take something away.
2. **The Cards are the only colourful thing.** Paper, ink and sand are quiet. Each Motivator's own colour appears on its
   disc and on the thin band along the edge of its slip, and nowhere else. Vermilion is the only other colour, and it
   only marks what matters most: the Summary's seals, the most important end of the scale, the primary button.
3. **Flat, real materials.** Paper slips with a hairline edge and a soft shadow, a disc of ink, a seal. No gradients
   that imitate light, no hard game-piece shadows, no heavy texture: the rake lines of the sand are barely there
   (`--texture-board`, and `none` removes them).
4. **Wabi-sabi, not mess.** A Card is laid with at most a fifth of a degree of tilt, so the column looks placed by
   hand. It straightens when it is touched.
5. **Motion is calm and has a reason.** Cards move the way paper would: dealt from a pile, turned over, lifted, slid,
   with a long ease-out (`--ease-calm`). Every animation is decoration on top of a complete static state, and all of
   them stop under `prefers-reduced-motion`.
6. **The Board never judges.** The seals number the Person's own top three. There is no score, no timer, no correct
   Order, and no "you win".

## The Board

| element | what it is                                                                                                       |
| ------- | ---------------------------------------------------------------------------------------------------------------- |
| page    | washi (`--color-background`), flat. Below the header, a grid: the Board on the left (at most `--board-width`) and the Summary on its right. Below 56rem everything stacks, the Summary under the Board |
| Board   | a plot of sand (`--color-board` + `--texture-board`) inside a hairline (`--color-board-edge`)                    |
| scale   | stands on the left of the Cards, its words written vertically: the two ends in small spaced capitals, joined by a brushstroke that swells towards the most important end, on top, which a vermilion dot marks |
| places  | above the Cards, the sideways scale: "Unmet", a hairline with three ticks (the empty circle, a dot, the full circle), "Met". The ticks sit exactly above the middle of an Unmet, a centred and a Met Card, so the legend teaches both the places and the marks. While a Card is dragged, the place it would settle in is inked and the others fade. It reuses the Fulfilment UI strings and is hidden from screen readers |
| Cards   | always one column, the most important on top: slips lying across, so any number of Cards fits any screen without scrolling sideways. The page scrolls if the column is taller than the screen. A Card is narrower than the column by twice `--fulfilment-offset`, so it can sit in the centre, to the right (Met) or to the left (Unmet) |

The column is drawn with `column-reverse`, so the DOM, the reading order and the focus order stay from least to most
important, and the Positions announced to screen readers keep their meaning. Only dnd-kit gets the Cards in the order
they are seen, with its vertical sorting strategy.

## The Card

```
 ┃┌──────────────────────────────┐
 ┃│ (●)  Title                    │  ← disc in the Motivator colour with the icon · Shippori Mincho 700
 ┃└──────────────────────────────┘
 ↑ band in the Motivator colour     paper slip (--color-card), hairline edge (--color-card-edge)
```

- **Back.** The `li` is the slip itself and shows the back: indigo (`--color-card-back`) with one fine circle. You see
  it while the Card is dealt and halfway through every flip.
- **Face.** `.card-inner` is the face lying on top of the back. It stays light in dark mode too, because paper does.
- **Flipped.** The Card grows taller: the Title takes its colour and the Description appears under it, aligned with
  it. The face takes a 6% tint of the Motivator colour. It turns over on its long side.
- **Fulfilment.** A Met Card sits `--fulfilment-offset` to the right of the centre and an Unmet one as far to the left
  (`data-fulfilment`). The place is never the only sign: at the end of its Title's row, on the front and when flipped,
  a Met Card shows a full circle of ink (`--color-met`, matcha) and an Unmet one the same circle drawn but empty
  (`--color-unmet`), its brushstroke a little lighter where it began. Empty, never crossed out. The mark is stamped in
  (scales down and turns into place) each time it changes. The button is described by "Met" or "Unmet" for screen
  readers; its name stays its Title.
- **Dragging sideways.** While a Card is carried, its mark already shows the place it would settle in if dropped now;
  its own place does not move until the drop, so the Card stays under the pointer.
- **Lifted.** Hover and keyboard focus lift the Card 2px. The focus ring is a 2px `--color-focus-board` outline around
  the whole Card. Dragging scales it to 102% with a deeper shadow.

## The Summary

Beside the Board, flowing with the page like it, the Summary says what the Order means in words:

- **Most motivating**: the Podium, most important first, each with its numbered seal, its disc and its Description.
- **Least motivating**: the three least important that are not on the Podium, least first, quieter (an un-inked
  rank, smaller discs, muted Titles, no Description) but never crossed out or dimmed into judgement.
- **Ranks.** Every listed Motivator shows its rank in the Order, 1 being the most important, so the two lists read the
  same way: 1, 2, 3 on the Podium, and on a Board of nine, 9, 8, 7 among the least motivating. Numerals in the display
  face, `aria-hidden`: the lists are `ol` and screen readers already get their order.
- A Met or Unmet Motivator shows the same mark as its Card after its Title, with the same accessible text.
- Each heading has a short brushstroke under it. An item fades in when it enters the Summary.
- While the Board is still as dealt (no Move yet), it only invites the Person to order the Cards: a random Order says
  nothing about them.

It is an `aside` named by its eyebrow ("Summary"), with real headings and lists, so screen readers can jump to it.

## The Podium

The Podium is the three most important Cards, and only the Summary shows it: the Cards on the Board carry no mark, the
order of the column already says it. Each item of the Podium wears a round vermilion seal, stamped slightly askew, with
a pale ring just inside its edge and its rank, 1, 2 or 3, in white. Among the least motivating the same circle is not
inked: a hairline and a numeral of ink. The seals are decoration only: the list is an `ol` and screen readers already
get its order. The Podium never covers every Card:
a Board of two Cards has one most motivating Motivator, and a Board of one Card has none.

## Motion

| moment         | what happens                                                                                     | where                         |
| -------------- | ------------------------------------------------------------------------------------------------ | ----------------------------- |
| Summary update | an item that enters the Summary fades in and rises 6px                                           | `.summary-item`               |
| opening deal   | a face-down pile sits on the first Position, at the bottom. Every 60ms a Card rises to its place, then turns face up | `.board-cards[data-dealing]`  |
| flip           | the face turns on its long side (`card-flip-a` / `card-flip-b`)                                  | `.card-inner`                 |
| keyboard Move  | the Cards slide from their old Positions to their new ones (Web Animations API)                  | `effects/moveAnimation.ts`    |
| Fulfilment     | the Card slides sideways to its new place, from where it was (keyboard) or was dropped (drag)    | `effects/moveAnimation.ts`    |
| Fulfilment mark | stamped in: from 160% and a quarter turn askew to its place, 380ms, each time it changes        | `.fulfilment-mark`            |
| sideways drag  | the places scale inks the target place, the others fade                                           | `.board-places[data-target]`  |
| drag           | dnd-kit moves the Card. CSS lifts it                                                             | `.card[data-dragging]`        |
| hover / focus  | the Card lifts and straightens                                                                   | `.card:hover`                 |
| button press   | the button sinks 1px                                                                             | `.share-button:active`        |

The Board sets `data-dealing` for 2.4s after it opens. The deal's delays only apply while that attribute is there, so
they never delay a later flip or Move. Under `prefers-reduced-motion` every animation above is off, and the Cards do
not lift on hover.

## Typography

| role                                                       | font                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| display: title, Card Titles, the Person's name             | **Shippori Mincho** 500 and 700 (`--font-display`)     |
| text: Descriptions, the scale, buttons, notices, footer    | **Zen Kaku Gothic New** 400, 500 and 700 (`--font-family`) |

Both fonts ship with the app in `src/fonts/` (latin subset, woff2, SIL Open Font License), so the Board makes no
third-party requests. Characters outside the latin subset fall back to the system's mincho or gothic. The scale is set
in small spaced capitals; the title has no effects.

## Colour tokens

Light mode is the default. Dark mode (sumi at night) redefines the tokens of the page and the Board. The Cards stay
paper in both.

| token                                         | light     | dark      | used for                                  |
| --------------------------------------------- | --------- | --------- | ----------------------------------------- |
| `--color-background`                          | `#f3efe6` | `#161513` | the page                                  |
| `--color-text` / `--color-muted`              | `#24221f` / `#757068` | `#ebe6dc` / `#a39d92` | text on the page   |
| `--color-surface`                             | `#fbf9f4` | `#201e1b` | notices                                   |
| `--color-line`                                | `#d8d0c1` | `#38342e` | hairlines: the name field, notices        |
| `--color-board` / `--color-board-edge`        | `#ebe5d8` / `#dcd3c3` | `#1d1b19` / `#2e2b27` | the sand and its edge |
| `--color-board-text`                          | `#6a645b` | `#a39d92` | the scale                                 |
| `--color-card` / `--color-card-edge`          | `#fdfbf7` / `#e6dfd2` | `#eeeae1` / `#d9d2c4` | the Card face and its edge |
| `--color-card-text` / `--color-card-muted`    | `#24221f` / `#625c54` | same | Title, Description            |
| `--color-card-back`                           | `#2e3d52` | `#283750` | the Card back (indigo)                    |
| `--color-accent` / `--color-accent-text`      | `#c0412a` / `#fdfbf7` | `#d24f36` / same | the primary button      |
| `--color-seal`                                | `#c0412a` | `#d24f36` | the Summary's seals, the scale's dot, the mark |
| `--color-success`                             | `#4f7342` | `#5f8a50` | "Link copied" (matcha)                    |
| `--color-met` / `--color-unmet`               | `#4f7342` / `#625c54` | same | the Fulfilment mark on a Card: the full / the empty circle, on paper. In the Summary, on the page, it uses `--color-success` / `--color-muted` |
| `--color-focus` / `--color-focus-board`       | `#24221f` | `#ebe6dc` | focus ring on the page / around a Card    |

The Motivator colour comes from each Motivator file (`--motivator-colour`). It has to carry a white icon, so pick
mid-to-dark colours. The flipped Title mixes it with `--color-card-text` so that light colours stay readable.

## Shape, spacing and motion tokens

| token                                              | default                          |
| -------------------------------------------------- | -------------------------------- |
| `--radius-card` / `--radius-board` / `--radius-piece` | 4px / 6px / 3px               |
| `--board-width`                                    | 34rem: the Summary takes the rest |
| `--card-gap`                                       | 0.625rem                         |
| `--fulfilment-offset`                              | `clamp(0.75rem, 5vw, 1.75rem)`: how far a Met or Unmet Card sits from the centre |
| `--texture-board`                                  | faint rake lines, or `none`      |
| `--shadow-card` / `--shadow-card-lifted`           | soft / deeper                    |
| `--deal-step` / `--deal-slide` / `--deal-turn` / `--duration-flip` | 60ms / 560ms / 420ms / 360ms |
| `--ease-calm`                                      | `cubic-bezier(0.22, 1, 0.36, 1)` |

## Rules for changes

- **No new UI strings for decoration.** A UI string must be translated for every Locale that is not shipped, so adding
  one breaks adopters' `check`. Decorations (seals, the scale's dot, the notice dot) are CSS with empty content or
  `aria-hidden` elements.
- **The domain never waits for an effect.** Animations and their timers live in CSS and `effects/`. Components only
  set data attributes (`data-dealing`, `data-flipped`, `data-dragging`).
- **Keep the accessible names.** The Card button's name is its Title, and the decorative elements are hidden from the
  accessibility tree.
- **Keep the DOM from least to most important.** The column reorders the Cards visually, never in the DOM.
- **Restyle with tokens first.** A new colour or size is a custom property on `:root`, documented here and in
  `config.example/theme.css`, so that adopters can change it.
- **Respect reduced motion.** A new animation has an entry in the `prefers-reduced-motion` block.
- **Stay original and respectful.** Draw on Japanese aesthetics (ma, wabi-sabi, ink and seal) without imitating real
  writing, family crests or religious symbols, and do not reproduce the cards, illustrations, name or branding of any
  existing commercial game or workshop kit (see [PRODUCT.md](PRODUCT.md)).
