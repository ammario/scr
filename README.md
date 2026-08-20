# s.cr

[s.cr](https://s.cr) is a private note sharing service. It encrypts your note in your browser, so only you and the recipient know its contents. All notes self-destruct after a period of time, defaulting to 24 hours.

I made it for sharing passwords, secret keys, and messages that I may not want to be associated with in the future.

## Security

s.cr stores the encryption key in the URL fragment (the part after `#`). Browsers
do not send fragments in HTTP requests, so the key is not sent to the server. New
v3 notes use an 84-bit, 14-character random base64url key and a public, unique
128-bit salt. Argon2id (8 MiB, one pass, one lane) raises the cost of every key
guess; HKDF-SHA-256 then derives separate AES-256-GCM keys for note text,
filenames, and files. Ciphertexts are self-describing and authenticated.

The shorter v3 key targets an economic attack cost rather than claiming 128 bits
of conventional security strength. The threat model, calculation, suite layouts,
and migration rules are documented in [docs/cryptography.md](docs/cryptography.md).
The client retains read compatibility with v1 and all v2 links, including both
128-bit and 256-bit v2 fragment keys.

But, you can only trust this site as much as you trust these claims.

## Development

This is a Hono server and React SPA deployed to Google Cloud Run with GCS for
storage.

### Prerequisites

- Node.js 20+
- bun (for package management)
- Google Cloud credentials with access to `scr-notes` bucket

### Setup

```bash
# Install dependencies
bun i

# Run development server
bun run dev

# Run tests (requires GCS credentials)
bun run test

# Run only unit tests (no GCS required)
make unit-test
```

### Deployment

```bash
# Build and deploy to Cloud Run
make deploy
```

## Architecture

- **Frontend**: React, React Router, and Vite
- **Backend**: Hono on Bun
- **Storage**: Google Cloud Storage (`scr-notes` bucket)
- **Deployment**: Google Cloud Run

## Testing

Tests use Vitest and React Testing Library. Integration tests connect to the real GCS backend.

```bash
# All tests
bun run test

# Unit tests only (crypto)
make unit-test

# E2E tests with Playwright
make e2e-test
```

## Contributing

This repo is open source for security purposes. Feel free to open up issues.
