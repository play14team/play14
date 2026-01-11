# Repository Guidelines

## Project Structure & Module Organization
- `packages/api`: Strapi 5 API (TypeScript, ESM). Source lives under `packages/api/src`.
- `packages/web`: Next.js 16 app (TypeScript, App Router). Source lives under `packages/web/src`.
- `packages/design`: design assets and Storybook in `packages/design/storybook`.
- `docs/`: technical specs and deployment notes.
- `compose.yaml`: local containers for API, DB, web, and Storybook.

## Build, Test, and Development Commands
- `bun install`: install workspace dependencies.
- `bun run db`: start the PostgreSQL container.
- `bun run api` / `bun run web`: start API or web dev servers.
- `bun run build`: build API admin and web production bundles.
- `bun run test`: run unit tests for API and web.
- Package filters (recommended): `bun --filter play14-api <script>` and `bun --filter play14-web <script>`.
- Containers: `podman-compose up` for full stack; `podman-compose down` to stop.

## Coding Style & Naming Conventions
- Indentation: 2 spaces, LF line endings (`.editorconfig`).
- Formatting: Prettier (no semicolons, double quotes, 100-char print width) via `bun --filter play14-web format`.
- Linting: ESLint in `packages/web` (`bun --filter play14-web lint`).
- Tests use `*.test.ts` (or `*.integration.test.ts`) naming and live near the code.

## Testing Guidelines
- Unit tests: Vitest in both API and web.
- API integration tests: `packages/api/src/__integration__` with `bun --filter play14-api test:integration` (spins up a test DB).
- Web E2E tests: Playwright via `bun --filter play14-web test:e2e`.

## Commit & Pull Request Guidelines
- Commit messages follow Conventional Commits: `type(scope): summary` (e.g., `fix(api): ...`).
- PRs should describe the change, include linked issues, and add screenshots for UI changes.
- If API routes or content types change, ensure permissions bootstraps remain up to date.

## Agent Notes
- Follow `CLAUDE.md` at the repo root and any package-level `CLAUDE.md` for deeper, package-specific guidance.
