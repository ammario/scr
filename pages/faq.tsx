export default function ViewNote() {
  return (
    <>
      <h1>Why is this secure?</h1>
      <p className="faq-answer">
        s.cr stores the encryption key within your URL fragment{" "}
        {"(the part after the #)"}. This key is never sent to the server, so the
        site operators have no way of decrypting the content. The fragment-key
        has 60-bits of entropy and we expand it through 128 rounds of pbkdf2
        before passing into AES-256. <br /> <br />
        But, you can only trust this site as much as you trust these claims.
      </p>
      <h1>Who are you?</h1>
      <p className="faq-answer">
        I'm <a href="https://ammar.io">Ammar</a>. You can reach me{" "}
        <a href="mailto:a@s.cr">here</a>.
      </p>
    </>
  );
}
