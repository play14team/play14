# Import Scripts

This folder contains one-off scripts that load data into Strapi.

## import-audience-attendees.ts

Import Mailchimp audience contacts and event attendees, deduplicate them, and
create/link players and users in Strapi.

### Admin upload (production-friendly)

Use the Next.js admin screen at `/admin/imports` to upload attendee and/or
Mailchimp CSV files. This runs the import on the Strapi backend without storing
files on disk and requires an organizer account (Host/Mentor/Founder).

### Inputs

- Mailchimp audience CSVs in `docs/audience/`
- Attendee CSVs in `docs/attendees/`

The script detects commas/semicolons, normalizes headers, and merges contacts by
email. It matches players by LinkedIn first (if provided) and then by
firstname/lastname. If a player is not found, it creates one. If a user is not
found, it creates one and links it to the player.

Visibility rules:
- When the "I want to appear..." column is explicitly `No`, `Non`, or `False`,
  the player is marked `visible=false`.

Preferences:
- T-shirt size and food preferences are stored on the player (private fields).

### Dry run (default)

Dry run only reports what would happen, without writing to the database.

```bash
cd packages/api
bun run src/scripts/import-audience-attendees.ts
```

### Apply changes

```bash
cd packages/api
bun run src/scripts/import-audience-attendees.ts --apply
```

### Optional flags

- `--verbose` prints each processed contact
- `--attendees <path>` limits attendee inputs to specific CSV files
- `--audience <path>` limits audience inputs to specific CSV files
- `--no-attendees` skips attendee CSVs entirely
- `--no-audience` skips Mailchimp CSVs entirely

You can pass multiple values by repeating the flag or using a comma-separated
list. Relative paths are resolved from the repository root.

Example (single test record):

```bash
cd packages/api
bun run src/scripts/import-audience-attendees.ts \
  --attendees docs/attendees/test-single-attendee.csv \
  --no-audience
```

### Output

Always writes reports:
- `docs/import-report.json`
- `docs/import-report.csv`

### Requirements

- The Strapi database must be reachable using `packages/api/.env`.
- Run from `packages/api` so relative paths resolve correctly.
