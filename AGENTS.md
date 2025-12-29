# Agent Guidelines

## Package Manager
Use `bun` for all package management and script execution (not npm/yarn).

```bash
bun install        # install deps
bun run build      # build client (Vite)
bun run start      # start production server (Hono)
bun run dev        # run Hono server with hot reload (serves from dist/)
bun run dev:vite   # run Vite dev server (with HMR, proxies /api to :3000)
bun test           # run tests
```

### Development Workflow
For development with HMR, run in two terminals:
1. `bun run dev` - Hono API server on :3000
2. `bun run dev:vite` - Vite dev server on :5173 (use this URL)

For production-like testing: `bun run build && bun run start`

## Architecture
- **Server**: Hono (src/server/index.ts) - serves API and static files
- **Client**: React SPA with React Router (src/client/)
- **Build**: Vite builds to dist/, Hono serves from dist/

## Key Directories
- `src/server/` - Hono API server
- `src/client/` - React SPA (pages, components entry point)
- `components/ui/` - shadcn-style UI components
- `util/` - Shared utilities (crypto, etc.)
- `lib/` - GCS backend, utils
