---
title: Evolution and team views from local CSV snapshots, outside the web app
status: Accepted
date: 2026-11-11
tags: [persistence, reporting, security, maintainability]
---

# 0002. Evolution and team views from local CSV snapshots, outside the web app

## Context and problem statement

Two needs go beyond a single board: comparing a person's ranking at two (or more) moments in time, and seeing a team
as a whole. The web app has no backend and its URL only holds one person's current board (ADR 0001). We need to
decide where history and aggregation live.

## Decision drivers

- **Security / privacy:** history of what motivates each team member is sensitive; it should stay on the manager's
  machine or in their private repository, not on a server.
- **Cost:** no backend, no database, no hosting beyond static files.
- **Maintainability:** keep the share URL small and with a single format; reuse a pattern already proven in
  progression-radar (its ADR 0004, local CSV snapshots, and ADR 0007, static HTML reports).

## Considered options

1. **Both moments in the same URL (`order=…&before=…`)**: self-contained link, but only one previous moment and a
   larger URL contract.
2. **Paste a previous link into the web app to compare**: no extra format, but the user must keep links themselves
   and team aggregation still has no home.
3. **A team URL format with several people**: shareable at once, but a second, long URL format to maintain.
4. **Local CSV snapshots plus HTML reports from the CLI**: dated records of share links in the adopter's repository,
   and commands that turn them into per-person and team reports.

## Decision outcome

Chosen option: **"Local CSV snapshots plus HTML reports from the CLI"**, because it keeps the web app focused on the
present board with one URL format, keeps sensitive history off any server, and reuses a design already working in
progression-radar.

- `snapshot:record` appends a row (date, person name, share link) to a CSV in the adopter's repository;
  `snapshot:link` reopens a snapshot as it was.
- `snapshot:report` writes static HTML: per person, how many positions each motivator moved between snapshots and a
  global change indicator (a rank distance such as Kendall tau); per team, average rank, dispersion, and the
  motivators the team agrees and disagrees on.
- The web app itself shows no history and no team view.

### Consequences

- **Good:** no backend; history stays private and versioned in git; the URL format stays minimal.
- **Trade-offs:** comparing over time and team views are only available to whoever runs the CLI on the adopter
  repository, not to every person in the browser.
- **Follow-ups:** neutralise spreadsheet formula prefixes (`=`, `+`, `-`, `@`) when writing names to CSV; always
  HTML-escape names and configuration text in reports; the snapshot CSV format is part of the public contract
  (ADR 0004).

## Links

- progression-radar ADR 0004 (local CSV snapshots) and ADR 0007 (static HTML reports from snapshots).
- ADR 0001 (share URL format).
