# s.cr

[s.cr](https://s.cr) is a private note sharing service. It encrypts your note in your browser, so only you and the recipient know its contents. All notes self-destruct after a period of time, defaulting to 24 hours.

I made it for sharing passwords, secret keys, and messages that I may not want to be associated with in the future.

## Security

s.cr stores the encryption key within your URL fragment (the part after the #). This key is never sent to the server, so the site operators have no way of decrypting the content. The fragment-key has 60 bits of entropy and we expand it through 128 rounds of pbkdf2 before passing into AES-256.

But, you can only trust this site as much as you trust these claims.

## Development

This is a full-stack Next.js application deployed to Google Cloud Run with GCS for storage.

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

- **Frontend**: Next.js with React, Emotion CSS
- **Backend**: Next.js API routes
- **Storage**: Google Cloud Storage (`scr-notes` bucket)
- **Deployment**: Google Cloud Run (standalone Next.js)

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