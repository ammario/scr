# s.cr

[s.cr](https://s.cr) is a private note sharing service. It encrypts your note in your browser, so only you and the recipient know its contents. All notes self-destruct after a period of time, defaulting to 24 hours.

I made it for sharing passwords, secret keys, and messages that I may not want to be associated with in the future.

## Security

s.cr stores the encryption key within your URL fragment (the part after the #). This key is never sent to the server, so the site operators have no way of decrypting the content. The fragment-key has 60 bits of entropy and we expand it through 128 rounds of pbkdf2 before passing into AES-256.

But, you can only trust this site as much as you trust these claims.

## Contributing

This repo is open source for security purposes. It's not very easy
to set up and deploy on your own.

Feel free to open up issues.