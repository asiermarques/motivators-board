---
title: Configured locales, one motivator file with all its translations, and lang in the share URL
status: Accepted
date: 2026-11-11
tags: [i18n, configuration, data-model, maintainability]
---

# 0003. Configured locales, one motivator file with all its translations, and lang in the share URL

## Context and problem statement

The interface must be multilingual, and the motivators are configured by each adopter (as Markdown files, following
progression-radar's configuration pattern). We need to decide who chooses the language, where translations of the
motivators live, and whether the language travels with a shared link.

## Decision drivers

- **Product:** the person playing chooses the language, and a link opened by someone else shows the same language.
- **Maintainability:** translations of a motivator must not drift apart (a key existing in one language and not in
  another); missing translations should fail fast in CI.
- **Robustness:** links must keep working when an adopter removes a language.

## Considered options

1. **Fixed language per deployment, chosen by the adopter**: simplest; links carry no language.
2. **Browser language with an optional selector, not in the URL**: automatic, but the same link renders differently
   for different viewers.
3. **User selector with `lang` in the URL, translations in one folder per locale**: shareable language, but keys can
   diverge between folders.
4. **User selector with `lang` in the URL, one file per motivator holding all its translations**.

## Decision outcome

Chosen option: **"User selector with `lang` in the URL, one file per motivator holding all its translations"**,
because the language is part of what is shared and a single file per motivator makes divergent keys between
languages impossible by construction.

- The settings file declares the available locales and a default one.
- `config/motivators/<key>.md` holds the motivator's icon/colour and its title and description per locale.
- UI strings are translated with i18next; adopters may override them per locale.
- `lang=<locale>` is written in the share URL; an unknown or removed locale falls back to the default one, and the
  initial language when the URL has none is the default locale.
- The configuration check fails if any motivator or UI string lacks a translation for a declared locale.

### Consequences

- **Good:** the same link looks the same for everyone; translations of a motivator are reviewed together.
- **Trade-offs:** larger configuration files and a bigger public contract (every string × every locale).
- **Follow-ups:** define the exact Markdown layout of a motivator file and document it in a motivators guide;
  `lang` is part of the share-link contract (ADR 0001, ADR 0004).

## Links

- ADR 0001 (share URL format), ADR 0004 (i18next as a dependency).
