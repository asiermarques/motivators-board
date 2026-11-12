---
title: Strict motivator order as a readable share URL in the fragment
status: Accepted
date: 2026-11-11
tags: [persistence, data-model, security, maintainability]
---

# 0001. Strict motivator order as a readable share URL in the fragment

## Context and problem statement

motivators-board is a static, game-like web app where one person ranks a configurable set of motivator cards from
least to most important. Like progression-radar (its ADR 0001, "Readable key-value share URL in the fragment"), there
is no backend: the person's board lives entirely in the URL, so a link is a shareable, bookmarkable snapshot of it.

We need to decide how the board is ranked (strict order or ties) and how it is serialised, so that links are readable,
survive being pasted in chat or documents, keep working when the adopter changes the configured motivators, and do
not leak a person's motivations into server logs.

## Decision drivers

- **Product:** a strict ranking keeps the tension of the card game (you have to choose); ties remove it.
- **Security / privacy:** what motivates a person is sensitive, close to 1:1 / performance-conversation data; it must
  not reach server or CDN access logs.
- **Maintainability:** readable, hand-editable links with standard `URLSearchParams` escaping; same conventions as
  progression-radar so both tools feel and behave alike.
- **Robustness:** old links must keep opening when motivators are added, removed or renamed in the configuration.

## Considered options

1. **Ordered key list in one parameter (`order=fre,cur,mas,…`)**: strict permutation, short and readable; needs keys
   that cannot contain the separator.
2. **Repeated parameter (`m=fre&m=cur&…`)**: strict permutation with no custom separator, but longer and noisier.
3. **Position per key (`cur=3&fre=1&…`)**: mirrors the radar's levels, but allows duplicates/ties and needs repair
   logic for invalid permutations.
4. **Positional/compressed encoding**: shortest, opaque, breaks on configuration changes.

## Decision outcome

Chosen option: **"Ordered key list in one parameter"**, because a strict permutation is the natural shape of the
game's ranking, it cannot express ties or duplicates by construction, and it stays short and readable.

Format, in the URL fragment (never sent to the server):

```
#name=Ana+L%C3%B3pez&lang=es&order=fre,cur,mas,rel,goa,hon,acc,ord,pow,sta
```

- `name`: the person's name, omitted when empty. `lang`: see ADR 0003.
- `order`: comma-separated motivator keys, from least to most important; written last.
- All cards are always on the table; there is no "hand" of unplaced cards.
- Leniency, as in progression-radar: unknown keys and duplicates are dropped (first occurrence wins); configured
  motivators missing from `order` are appended at the end in configuration order; a dismissible notice names what
  was ignored or added.
- Without `order`, the cards are dealt in a random order to avoid anchoring the person on the configuration order;
  `order` is written to the URL on the first move.
- Motivator keys are restricted to `[a-z0-9-]+`; the configuration check rejects any other key, so the comma
  separator never needs escaping.

### Consequences

- **Good:** short, readable, paste-safe links; impossible to encode an invalid ranking; configuration changes do not
  break old links; the person's data stays out of access logs.
- **Trade-offs:** motivator keys are more constrained than progression-radar's category keys; a strict order cannot
  say "these two matter equally".
- **Follow-ups:** the share-link format is part of the public contract (semver, see ADR 0004); document it in a
  share-link guide.

## Amendment (2026-11-12): Fulfilment in `met` and `unmet`

Requisites 003 lets the person say whether each motivator is met right now, independently of the order. It travels
in two more parameters of the same shape as `order`, written after `lang` and before `order`:

```
#name=Ana&lang=es&met=cur,acc&unmet=pow&order=fre,cur,mas,rel,goa,hon,acc,ord,pow,sta
```

- `met` and `unmet`: comma-separated motivator keys, in the order (least to most important), so the same board always
  gives the same link; each is left out when empty. A motivator in neither has no fulfilment.
- Leniency: unknown keys and duplicates are dropped, and a key listed in both is ambiguous and dropped from both; the
  notice names them. They apply to a dealt board too, and a fulfilment change on a dealt board writes `order`.
- `met` and `unmet` join the reserved parameters (`name`, `lang`, `met`, `unmet`, `order`).
- The strict order is unchanged: fulfilment never creates a tie, an unplaced card or a second order. Adding the
  parameters widens the public contract: a minor version (1.1.0).

## Links

- progression-radar ADR 0001 (readable key-value share URL in the fragment).
- ADR 0003 (`lang` parameter), ADR 0004 (public contract and versioning).
