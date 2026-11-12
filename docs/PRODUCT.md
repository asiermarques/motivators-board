# Product

motivators-board is a game-like tool to talk about what motivates a person. The person deals a set of motivator cards
on a table and ranks them from least to most important to them, by dragging them. There is no backend: the whole board
lives in the URL, so a link is a shareable snapshot of it.

It uses the well-known mechanic of ranking motivator cards, with its own name, cards, icons and visual design.

## Who it is for

- **People**: someone who wants to reflect on what drives them, alone or in a one-to-one, and keep or send the
  result as a link.
- **Managers and mentors**: someone who runs that conversation with a person, keeps dated records of the people they
  work with, and looks at how a person's motivators change over time and at what a team shares or disagrees on.
- **Adopters**: an organisation or team that configures its own motivators, languages and look, and deploys the tool.
  The recommended way is an **Adopter repository** that holds only their `config/`, their `snapshots/` and a
  `package.json` that depends on motivators-board.

## Core concepts

| concept       | meaning                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Motivator     | something that can motivate a person, shown as a card, e.g. Curiosity or Freedom. One Markdown motivator file per motivator, with its icon, colour and its title and description in every locale |
| Motivator key | the short, stable identifier of a motivator (`[a-z0-9-]+`), used in links and snapshots                                                                                                          |
| Board         | where the person places every configured motivator in one column, from least important (bottom) to most important (top)                                                                               |
| Order         | the strict ranking of the board: every motivator has exactly one position and there are no ties                                                                                                  |
| Fulfilment    | whether a motivator is met in the person's life right now: Met (its card sits to the right), Unmet (to the left) or none (the centre, the default). Independent of the order                   |
| Person        | the person whose board is shown: their name, their order, the fulfilment of their motivators and the locale they use                                                                           |
| Locale        | a language declared in the configuration; the person chooses one with a selector                                                                                                                 |
| Share link    | the URL that holds the whole state of the person, so it can be bookmarked or sent                                                                                                                |
| Snapshot      | a dated CSV file, outside the app, with one row per person recorded from their share link                                                                                                        |
| Report        | a static HTML page written from the snapshots: one person's evolution, or a team overview                                                                                                        |
| Configuration | the adopter's files: the settings, the motivator files, UI string overrides and the theme                                                                                                        |

## What it does

The first release, 1.0.0, does the Board, the Share link and the Configuration in a single Locale. The Locale
selector, sounds, the celebration, Snapshots and Reports, marked _(later)_ below, are not in it yet. 1.1.0 adds the
Fulfilment of each motivator, and it is the first version published on npm (1.0.0 never was).

- Deals every configured motivator on the board as a card. A new board, with no order in its link, deals the cards in
  a random order so the configuration order does not anchor the person.
- Lets the person rank the cards by dragging them with a mouse or a finger (a short press, so a swipe still scrolls),
  or with the keyboard alone: the up and down arrows move the focused card one position (up is more important), Home
  and End send it to an end. Moves are animated and announced to screen readers.
- Lets the person say whether each motivator is met right now, without changing the order: a card dragged sideways
  settles to the right (Met), back in the centre (the default) or to the left (Unmet), and one diagonal drag can change
  both its position and its fulfilment. With the keyboard, the right and left arrows slide the focused card one place.
  A small drag sideways while moving a card vertically does not count. A Met card shows a full circle and an Unmet one an
  empty circle, so neither colour nor place carries it alone; a small scale above the cards shows the three places
  and, while dragging, the one the card would settle in. Every change is announced to screen readers.
- Lays the cards in a single column, the most important on top, so every board fits any screen without scrolling
  sideways. On wide screens the board keeps to the left.
- Shows a summary beside the board (under it on narrow screens): the three most motivating motivators with their
  descriptions, and the three least motivating, each marked Met or Unmet when it is. It updates with every move and
  fulfilment change, and waits for the first one on a board just dealt.
- Flips a card, with a click or Enter, to show its description.
- Looks calm and Japanese-inspired, washi paper, sumi ink and one vermilion accent, and still moves like cards: they
  are dealt face down from a pile and turned face up when the board opens. In the summary, the three most motivating
  are stamped with a seal numbered 1, 2 and 3, and the least motivating show their own rank, quieter. See [DESIGN.md](DESIGN.md).
- Animations that are not essential are disabled under `prefers-reduced-motion`.
- _(later)_ Plays optional sounds (off by default) and a small celebration when the person is done.
- Lets the person edit their name. _(later)_ Lets them choose a locale; the interface and the motivators' texts follow
  it. In 1.0 the configuration declares one locale.
- Keeps the share link up to date with every move, fulfilment change and name change, without adding browser history,
  and copies it with a button. On a new board, `order` is only written after the first move or fulfilment change. The link can be edited by hand in
  the address bar and the page follows.
- Opens broken or partly outdated links anyway: unknown motivators and duplicates are dropped (from `order`, `met` and
  `unmet`), a motivator listed both as Met and as Unmet gets neither, motivators missing from the link are added at the end, an unknown locale falls back to the default one, and a dismissible notice says what
  was ignored or added.
- Lets adopters change the motivators, the locale, the UI strings, the title, the logo, the footer and the styles from
  their own config folder; each file in it replaces the sample file of the same name in `config.example/`, so a fresh
  clone runs with no setup. Its `motivators/` folder, when there is one, is the whole set of motivators.
- Installs from npm into an Adopter repository: `motivators-board init` copies the sample configuration to `config/`
  and adds the `dev`, `build`, `preview` and `check` scripts.
- Checks the configuration (`npm run check`) and fails the build when it is invalid, listing every problem, including
  a motivator file missing its icon, colour, title or description, a motivator key outside `[a-z0-9-]+` or equal to
  `name`, `lang`, `met`, `unmet` or `order`, or a UI string missing for a locale that is not shipped. In dev, the app shows the same
  list instead of the board.
- _(later)_ Records people in dated CSV snapshots on the user's machine (`snapshot:record`), turns a recorded row back into a
  share link (`snapshot:link`) and checks snapshots against the current configuration (`snapshot:check`).
- _(later)_ Writes Reports from the snapshots (`snapshot:report`), as HTML files with no JavaScript:
  - **per person**: how many positions each motivator moved between snapshots, and a global indicator of how much the
    order changed;
  - **per team**: the average position of each motivator, how much the team disagrees on it, and the motivators the
    team shares at the top and at the bottom.

## Product decisions

- **No backend, no accounts.** The app stores nothing: the person lives in the share link. The only records are the
  snapshot files the user creates on their own machine, which hold personal data, are git-ignored upstream and are
  never sent anywhere. See [ADR 0002](adr/0002-evolution-and-team-views-from-local-snapshots.md).
- **A strict order, every card on the table.** Ranking forces a choice: there are no ties, no discard pile and no hand
  of cards still to place. See [ADR 0001](adr/0001-strict-order-share-url-in-the-fragment.md).
- **Readable share links, out of server logs.** What motivates a person is sensitive, so the board lives in the URL
  fragment as readable parameters: `#name=Ana&lang=es&met=cur&unmet=sta&order=fre,cur,…`. `name`, `lang`, `met`,
  `unmet` and `order` are reserved.
  See [ADR 0001](adr/0001-strict-order-share-url-in-the-fragment.md).
- **Fulfilment is the present, beside the order.** A person can say whether each motivator is met right now, in three
  places only (Met, none, Unmet), independently of its position. It is not a rating of how a change would affect a
  motivator, which stays a non-goal, and it is not in Snapshots or Reports yet.
- **Old links keep working.** When the configuration changes, a link is repaired instead of rejected, and the person
  is told what changed. There is no blocking error screen for links.
- **The present in the app, history and teams outside it.** The app shows one person's current board. Comparing moments
  in time and looking at a team are done with snapshots and Reports from the command line.
  See [ADR 0002](adr/0002-evolution-and-team-views-from-local-snapshots.md).
- **The language travels with the link.** The person chooses the locale and it is part of the share link, so whoever
  opens it sees the same board. A motivator's translations live together in one file.
  See [ADR 0003](adr/0003-configured-locales-with-lang-in-the-share-url.md).
- **Customisation by depending on the tool.** Upstream owns `config.example/`; adopters own their config folder. An
  Adopter repository uses motivators-board as a dependency and upgrades by changing a version; its public contract (the
  commands, the configuration files, the share link format and the snapshot format) is versioned with semver.
  See [ADR 0004](adr/0004-stack-and-copy-adapt-from-progression-radar.md).
- **Configuration mistakes are shown, not hidden.** An invalid configuration lists every problem instead of rendering,
  and fails the tests and the production build.

## Non-goals

- Storing people, history or teams on a server, or any login.
- Comparing moments or several people inside the app: a link holds one person, and the app does not open snapshots.
- Ties between motivators, a discard pile or a hand of unplaced cards.
- Rating how a change (a new role, a reorganisation) affects each motivator, and notes on cards. Both were considered
  for the first version and left out; they can be revisited later.
- An in-app editor for motivators: they are edited in the configuration files.
- Reproducing the cards, illustrations, name or branding of any existing commercial game or workshop kit.

## Open questions

- The sample set of motivators shipped in `config.example/`.
