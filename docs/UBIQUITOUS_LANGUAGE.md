# Ubiquitous Language

## The board

| Term                      | Definition                                                                                              | Aliases to avoid                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Motivator**             | Something that can motivate a **Person**, such as Curiosity or Freedom, defined in the **Configuration** | Value, driver, card (for the concept) |
| **Motivator key**         | The short, stable identifier of a **Motivator** (`[a-z0-9-]+`), used in **Share links** and **Records** | Id, slug, code                      |
| **Card**                  | The visual form of one **Motivator** on the **Board**, showing its icon and title                       | Tile, item                          |
| **Title**                 | The name of a **Motivator** in one **Locale**, shown on the front of its **Card**                       | Label, name (reserved for **Person**) |
| **Description**           | The text explaining a **Motivator** in one **Locale**, shown on the back of its flipped **Card**        | Body, explanation                   |
| **Board**                 | The single column where a **Person** places every configured **Motivator**, from least important (bottom) to most important (top) | Table, deck, game                   |
| **Order**                 | The strict ranking of a **Person**'s **Board**: every **Motivator** exactly once, no ties               | Ranking, rank, sort                 |
| **Position**              | The place of one **Motivator** in an **Order**                                                          | Rank, slot, index                   |
| **Deal**                  | Placing every **Motivator** on a new **Board** in a random **Order**, so the **Configuration order** does not anchor the **Person** | Shuffle, reset                      |
| **Podium**                | The three most important **Cards** of a **Board**, never all of them, shown by the **Summary** with seals numbered 1, 2 and 3; only visual, never stored | Top three, winners, leaderboard, medals |
| **Summary**               | What an **Order** says beside the **Board**: the **Podium** as the most motivating, and up to three of the least important as the least motivating; only visual, never stored | Results, report (reserved for **Report**), score |
| **Move**                  | One drag of a **Card** to a new **Position** by the **Person**                                          | Swap, drop                          |
| **Fulfilment**            | Whether a **Motivator** is met in the **Person**'s life right now, shown by the sideways place of its **Card**: **Met**, **Unmet** or none (the centre). Independent of its **Position** | Satisfaction, status, score, rating |
| **Met**                   | The **Fulfilment** of a **Motivator** that is met: its **Card** sits to the right                       | Satisfied, fulfilled, done          |
| **Unmet**                 | The **Fulfilment** of a **Motivator** that is not met: its **Card** sits to the left                    | Unsatisfied, missing, failed        |

## People and roles

| Term            | Definition                                                                                                  | Aliases to avoid               |
| --------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **Person**      | The individual whose **Board** is shown, with their name, **Order**, **Fulfilment** and **Locale**          | Player, user, participant      |
| **Facilitator** | Someone who runs the conversation with a **Person** and keeps **Snapshots** of the people they work with    | Manager, mentor, user          |
| **Team**        | A group of **People** whose latest **Records** are compared together in a **Team report**                  | Group, squad                   |
| **Adopter**     | An organisation or team that configures and deploys motivators-board for its own use                       | Customer, client, tenant       |

## Share link

| Term                     | Definition                                                                                                     | Aliases to avoid                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Share link**           | The URL whose fragment holds a **Person**'s whole state (`name`, `lang`, `met`, `unmet`, `order`)              | Share URL, link, permalink, snapshot   |
| **Reserved parameter**   | One of `name`, `lang`, `met`, `unmet` and `order`, which can never be a **Motivator key**                      | Keyword                                |
| **Normalisation**        | Turning a broken or outdated **Share link** into a valid **Person**: drop unknown keys and duplicates, append missing **Motivators**, fall back to the **Default locale** | Repair, leniency, fixing, sanitising   |
| **Link notice**          | The dismissible message telling the **Person** what **Normalisation** ignored or added                         | Warning, error, alert                  |

## Languages

| Term               | Definition                                                                                        | Aliases to avoid          |
| ------------------ | ------------------------------------------------------------------------------------------------- | ------------------------- |
| **Locale**         | A language declared in the **Configuration** and carried as `lang`; one per **Configuration** for now, later chosen by the **Person** | Language, lang (outside the URL) |
| **Default locale** | The **Locale** used when a **Share link** has no `lang` or an undeclared one                      | Fallback language         |
| **UI string**      | A piece of interface text, translated per **Locale** and overridable by the **Adopter**           | Label, message, copy      |

## History and Reports

| Term                  | Definition                                                                                                | Aliases to avoid                          |
| --------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Snapshot**          | A dated CSV file, kept on the **Facilitator**'s machine, holding one **Record** per **Person**            | Export, backup, history file              |
| **Record**            | One row of a **Snapshot**: a **Person**'s **Share link** at that date, identified by a unique `id`        | Entry, row, snapshot (for a single row)   |
| **Report**            | A static HTML page, with no JavaScript, written from **Snapshots**                                         | Dashboard, view, chart                    |
| **Person report**     | A **Report** of one **Person**'s **Shifts** and **Change indicator** across their **Records**              | Evolution view, individual report         |
| **Team report**       | A **Report** of a **Team**'s **Average positions**, **Dispersion** and **Shared top** and **Shared bottom** | Team view, team overview, aggregate       |
| **Shift**             | How many **Positions** one **Motivator** moved between two **Records** of the same **Person**              | Move (reserved for a drag), delta, jump   |
| **Change indicator**  | One number saying how much a **Person**'s whole **Order** changed between two **Records** (Kendall tau distance) | Rank distance, change score, drift   |
| **Average position**  | The mean **Position** of a **Motivator** across a **Team**'s latest **Records**                            | Average rank, mean rank                   |
| **Dispersion**        | How much a **Team** disagrees on the **Position** of a **Motivator**                                       | Disagreement, spread, variance            |
| **Shared top**        | The **Motivators** a **Team** agrees are among the most important                                          | Team favourites, common top               |
| **Shared bottom**     | The **Motivators** a **Team** agrees are among the least important                                         | Common bottom                             |

## Adoption

| Term                       | Definition                                                                                                  | Aliases to avoid                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Configuration**          | The **Adopter**'s settings, **Motivator files**, **UI string** overrides and theme                          | Config (in prose), setup, settings |
| **Motivator file**         | The Markdown file named after a **Motivator key**, holding its icon, colour, **Title** and **Description** (in the single declared **Locale**) | Motivator definition, card file    |
| **Configuration order**    | The order in which **Motivators** are declared in the **Configuration**; never the **Person**'s **Order**   | Default order                      |
| **Sample configuration**   | Upstream's `config.example/`, used for any file the **Adopter** does not override                           | Defaults, template, example config |
| **Adopter repository**     | A repository that holds only an **Adopter**'s `config/`, `snapshots/` and a dependency on motivators-board  | Fork, instance                     |
| **Public contract**        | The commands, **Configuration** files, **Share link** format and **Snapshot** format, versioned with semver | API, interface                     |

## Relationships

- A **Configuration** declares one or more **Motivators** (one **Motivator file** each) and one or more **Locales**, exactly one of them the **Default locale**.
- A **Motivator** has exactly one **Motivator key**, and one **Title** and one **Description** per declared **Locale** (one Locale is declared for now).
- A **Board** belongs to exactly one **Person** and shows exactly one **Card** per configured **Motivator**.
- An **Order** gives every configured **Motivator** exactly one **Position**; no two **Motivators** share a **Position**.
- A **Motivator** on a **Board** has at most one **Fulfilment**, whatever its **Position**; changing one never changes the other.
- A **Share link** holds exactly one **Person**; opening it always goes through **Normalisation**, which may produce one **Link notice**.
- A **Snapshot** has one date and one **Record** per **Person**; a **Person**'s history is the sequence of their **Records** across **Snapshots**.
- A **Person report** covers one **Person**'s **Records**; a **Team report** covers the latest **Record** of each **Person** in a **Team**.
- A **Move** happens on the **Board**; a **Shift** is only ever measured between two **Records**.

## Example dialogue

> **Dev:** "When a **Person** opens a **Share link** without `order`, do we show the **Motivators** in **Configuration order**?"
> **Domain expert:** "No — we **Deal** them in a random **Order**, so the **Configuration order** doesn't anchor them. `order` is only written to the **Share link** after their first **Move**."
> **Dev:** "And if the **Adopter** removed a **Motivator** since the link was made?"
> **Domain expert:** "**Normalisation** drops its **Motivator key**, appends any new **Motivators** at the end, and the **Link notice** tells the **Person** what changed. We never refuse a link."
> **Dev:** "When the **Facilitator** records that **Person** again next quarter, is the **Person report** comparing **Moves**?"
> **Domain expert:** "No, **Moves** are drags on the **Board** and are never stored. The **Person report** compares two **Records**: each **Motivator**'s **Shift**, plus one **Change indicator** for the whole **Order**."
> **Dev:** "So for the **Team report** we take every **Person**'s latest **Record**, and a **Motivator** with high **Dispersion** can't be in the **Shared top**?"
> **Domain expert:** "Exactly — the **Shared top** is where the **Team** agrees, so a good **Average position** and low **Dispersion** are what put a **Motivator** there."

## Flagged ambiguities

- **"snapshot" means three different things.** PRODUCT.md and ADR 0001 call a **Share link** "a shareable snapshot" of the board; the glossary defines **Snapshot** as a dated CSV file; and `snapshot:link` "reopens a snapshot", meaning a single row. Recommendation: **Snapshot** is only the CSV file, a row is a **Record**, and a link is always a **Share link**. Reword the opening of PRODUCT.md and ADR 0001's context accordingly.
- **"move" means a drag and a change over time.** "every move", "on the first move" (a drag) versus "the moves of each motivator between snapshots" (ARCHITECTURE.md). Recommendation: **Move** for the drag, **Shift** for the change between **Records**.
- **"order" means the Person's ranking and the configuration's sequence.** Recommendation: bare **Order** is always the **Person**'s; the other is always spelled **Configuration order**.
- **"rank" / "position" / "average rank".** ADR 0002 says "average rank", PRODUCT.md says "average position", model.ts mentions "rank distances". Recommendation: **Position**, **Average position**, **Change indicator**; keep "Kendall tau" only as the implementation of the **Change indicator**.
- **Position numbering is undefined.** The `order` parameter runs from least to most important, while Reports talk about "the top". Recommendation: decide and document whether **Position** 1 is the most important (natural for people and Reports, "my #1 motivator") or the least important (natural for the `order` list). Suggested: 1 = most important, derived from `order` read right to left.
- **"user" is used for the Facilitator.** "Records people in dated CSV snapshots on the user's machine" — the person running the CLI is not the **Person** on the **Board**. Recommendation: **Facilitator** (covers managers and mentors), and avoid "user" in domain prose.
- **"table" for the Board.** "deals a set of motivator cards on a table", "every card on the table". Recommendation: **Board** everywhere; "table" only as a visual metaphor in UI copy if at all.
- **What a Team is, is not defined.** Reports work "per team", but nothing says whether a **Team** is everyone in one **Snapshot**, everyone in the Snapshots folder, or a named subset. Recommendation: settle this before implementing `snapshot:report`.
- **When the Board is "done" is not defined.** PRODUCT.md plays "a small celebration when the person is done" and ARCHITECTURE.md reacts to "the board completed", but with every **Card** always on the **Board** and a strict **Order**, a **Board** is valid from the first **Deal**. Recommendation: define the trigger explicitly (e.g. an explicit "I'm done" action by the **Person**) and name it.
- **"Shared top" / "Shared bottom" boundaries are not defined.** "The motivators the team shares at the top and at the bottom" needs a rule (top N? a **Dispersion** threshold?). Recommendation: specify it with the **Team report** design.
- **Excluded concepts.** "hand" (unplaced cards), "discard pile" and "ties" appear only as non-goals; they must not become terms in code or UI copy.
