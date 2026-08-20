# Cryptography design

## Invariants

1. The URL fragment is the only secret needed to decrypt a note and is never
   sent to the server.
2. Ciphertexts authenticate their contents, purpose, and suite version.
3. Released suites are immutable. New encryption uses the current suite, while
   decryption continues to dispatch v1, v2, and every future suite from the
   ciphertext envelope.
4. Public server metadata is not trusted to select a decryption algorithm.
5. A note-scoped crypto session performs the expensive KDF once, then uses HKDF
   to separate note-text, filename, and file keys.

Changing any KDF parameter, URL-key interpretation, envelope layout, HKDF label,
or AES-GCM authenticated-data label requires a new suite version. Never redefine
an existing version. Add frozen decryption fixtures before releasing a suite so
future compatibility tests do not accidentally generate fixtures with current
code.

## Current suite: v3

- URL key: 14 independent base64url characters, exactly 84 random bits
- Per-note salt: 16 random bytes, public and embedded in every payload
- KDF: Argon2id, 8,192 KiB, one iteration, one lane, 32-byte output
- Key separation: HKDF-SHA-256 with suite- and purpose-specific labels
- Encryption: AES-256-GCM with a fresh 12-byte IV and a 16-byte tag per payload
- Text envelope: `scr:v3:` followed by base64url(`salt || IV || ciphertext+tag`)
- File envelope: `s.cr\0v3\0 || salt || IV || ciphertext+tag`

The 8 MiB setting measured approximately 4.4 ms median in Chrome 151 on the
reference macOS client during the 2026-08-19 pre-release benchmark. This leaves
headroom under the 10 ms median client budget; real-user device performance
should be remeasured when reviewing the economic model.

The repeated salt costs storage, not URL length. It makes each payload
self-describing and allows detached file ciphertext to remain decryptable. The
note session caches the Argon2 master key only for its own lifetime, so all
payloads sharing that salt incur one Argon2 evaluation while receiving distinct
HKDF-derived keys.

The unique salt prevents an attacker from precomputing the 84-bit key space once
or reusing a guessed-key KDF result across notes. The salt is not secret; changing
it changes the derived key and therefore causes AES-GCM authentication to fail.

## Why 84 bits

The product requirement is economic: under the model below, recovering one
note with approximately 50% probability should cost more than \$1 billion in
2026 dollars against classical specialized hardware. This is not a claim of
128-bit conventional security strength, and it excludes endpoint compromise,
implementation flaws, plaintext disclosure, and cryptographically relevant
quantum computers.

The deliberately attacker-favorable baseline uses:

- an NVIDIA H100's published 3.35 TB/s memory bandwidth;
- AWS's published \$5.191 per H100-hour capacity-block price on 2026-08-19;
- only one 8 MiB memory fill per Argon2 guess, ignoring additional reads,
  writes, and computation; and
- a further 2.1x reduction for RFC 9106's best documented one-pass Argon2id
  time-area tradeoff.

This yields an optimistic attacker cost of approximately
`$1.72e-9` per guess. For `h` uniformly random key bits, the expected and median
work are approximately half the key space:

```text
cost_50 = 2^(h - 1) * cost_per_guess / specialized_hardware_advantage
```

We reserve an additional 1,000,000x cost advantage for custom hardware, cloud
markup avoidance, and future improvement. Thirteen base64url characters contain
78 bits and produce only about $260 million under that reserve. Fourteen contain
84 bits and produce about $16.6 billion, making 14 the shortest base64url key
that clears the target under the chosen model.

Dollar-denominated security changes with hardware and energy economics. Review
this model periodically. Strengthening new notes requires a new suite version;
it must not make old notes unreadable.

Primary references:

- [RFC 9106: Argon2](https://www.rfc-editor.org/rfc/rfc9106.html)
- [NVIDIA H100 specifications](https://www.nvidia.com/en-us/data-center/h100/)
- [AWS EC2 Capacity Blocks pricing](https://aws.amazon.com/ec2/capacityblocks/pricing/)
- [NIST security-strength definition](https://csrc.nist.gov/glossary/term/security_strength)

## Legacy readers

- v2 strings use `scr:v2:` and v2 files use `s.cr\0v2\0`. They use the original
  HKDF-SHA-256 labels and support both historical 256-bit and 128-bit URL keys.
- v1 payloads have no version prefix and retain the original PBKDF2/CryptoJS
  decoding paths.

Legacy code is decrypt-only. New encryption always uses v3.
