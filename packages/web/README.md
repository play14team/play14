# #play14 Web

Next.js 16 frontend for the #play14 global community platform.

> This package is part of the [play14 monorepo](../../README.md).

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Runtime**: React 19, TypeScript 5.9
- **Styling**: SCSS
- **Maps**: Mapbox GL
- **Hosting**: Clever Cloud Node.js app

## Getting Started

### From Monorepo Root

```bash
# Install all dependencies
bun install

# Start the web frontend
bun run web
```

### From This Directory

```bash
# Development mode with Turbopack
bun run dev

# Production build
bun run build

# Run production server
bun run start
```

## Development

### Code Quality

```bash
# Run ESLint
bun run lint

# Format code with Prettier
bun run format
```

### Environment Variables

Create a `.env.local` file with required environment variables:

```env
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=<your-mapbox-token>
```

## Container Development

From the monorepo root:

```bash
# Start web frontend with all services
podman-compose up play14-web

# Start all services
podman-compose up
```

## Features

- Server-side rendering (SSR)
- Event calendar and scheduling
- Player profiles
- Interactive maps with Mapbox
- Server actions for form handling
- Responsive design

## Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/              # Utility functions and API clients
├── styles/           # Global SCSS styles
└── types/            # TypeScript type definitions
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev)
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)

