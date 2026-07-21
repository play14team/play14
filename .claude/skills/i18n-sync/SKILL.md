---
name: i18n-sync
description: Synchronize the six next-intl locale files (en, fr, de, es, it, pt) in the play14 web app so missing keys never throw at runtime. Trigger proactively whenever the user mentions i18n, translations, locale files, "missing keys", next-intl, or adds/edits any UI copy, server action, or message file under `packages/web/messages/`. next-intl throws `MISSING_MESSAGE` at runtime when a key is absent in the active locale, so this sync is a required step after any UI-copy change — not optional, and not only when the user asks for it.
---

# i18n-sync

Keep `packages/web/messages/{en,fr,de,es,it,pt}.json` in sync. English is the authoritative source; the other five locales must mirror its key structure. Any divergence can crash a page in production.

## When to invoke

- After adding, editing, or removing UI strings in `packages/web/src/**`.
- When the user mentions i18n, translations, locales, or "missing keys".
- When typecheck or a pre-commit hook flags a message-key problem.
- As a routine audit before release.

## Workflow

### 1. Diff the message files

From the repo root:

```bash
python3 .claude/skills/i18n-sync/scripts/diff_messages.py packages/web/messages
```

The script emits JSON on stdout with `total_keys`, a `per_locale` breakdown (`count`, `missing[]`, `extra_vs_en[]`), and `en_reference` (the English values for each key, for copying as placeholders). It exits `0` if everything is in sync, `1` otherwise.

Show the user a compact summary: missing counts per locale + up to 5 example missing keys per locale. Do not dump the full JSON unless they ask.

### 2. Decide a strategy

Ask the user which approach to apply. Use the `AskUserQuestion` tool with these options so they choose once per batch, not per key:

- **translate** — prompt per-locale translations inline. Use only when the user has the translations ready.
- **placeholder** — copy the English value prefixed with `[TODO:<locale>]` (e.g. `[TODO:fr] Back to home`). Never blocks the build, stays greppable, easy to fix later.
- **skip** — leave the keys missing (user will handle manually, e.g. via a translation service).

When the user just says "fix them" without choosing: default to **placeholder** for non-English locales. Never silently leave keys missing — that defeats the whole point of this skill.

### 3. Write back, preserving structure

- Keep the nested JSON structure. A key like `nav.home` lives at `{ "nav": { "home": ... } }`, not flattened.
- Insert new keys at the **bottom of their parent object**. Do not resort — resorting produces a huge unrelated diff.
- Preserve 2-space indentation, LF endings, trailing newline (matches Biome formatting).
- Preserve ICU / plural syntax — `{count, plural, one {# item} other {# items}}` — do not translate the skeleton tokens (`one`, `other`, `#`, variable names). Only translate the natural-language fragments between them, and only when the user chose `translate`.
- If an array of strings appears as a value (e.g. a list of bullet points), preserve it as an array; insert a matching array in the target locale with either translations or placeholder entries.

### 4. Verify

```bash
bun --filter play14-web typecheck
```

If typecheck flags anything message-related, investigate before declaring done. next-intl is sometimes configured with type-safe keys (depends on `messages` typing); failures here usually mean structural drift.

### 5. Final report

Summarise to the user:

1. Keys added per locale, grouped by strategy used.
2. Remaining placeholder entries that still need translation. Give a single grep command they can run to find them all:

   ```bash
   grep -rn '\[TODO:' packages/web/messages/
   ```

## Not in scope

- **Do not add new keys to English.** English additions come from code changes (UI work), not from this skill. If a key appears in fr/de/es/it/pt but is missing from en, that signals a refactor artefact — surface it to the user rather than auto-aligning.
- **Do not remove unused keys.** Detecting whether a key is unused requires verifying zero callers across `packages/web/src/`, which is out of scope here.
- **Do not touch string contents** in existing keys. This skill only adds missing keys; it never edits translations in place.

## Why this matters

next-intl fails loud in development but also fails loud in production — a missing key throws an unhandled error that takes down the rendering component. This skill is the only reliable guard because Biome cannot catch it and typecheck only catches it when types are generated from the messages file.
