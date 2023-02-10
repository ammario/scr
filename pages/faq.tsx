export default function ViewNote() {
  return (
    <>
      <h1>Why is this secure?</h1>
      <p className="faq-answer">
        s.cr stores the encryption key within your URL fragment{" "}
        {"(the part after the #)"}. This key is never sent to the server, so the
        site operators have no way of decrypting the content. The fragment-key
        has 60-bits of entropy, but we put it through 128 rounds of pbkdf2 for
        some expansion.
      </p>
      <h1>Who are you?</h1>
      <p className="faq-answer">
        I'm <a href="https://ammar.io">Ammar</a>. You can reach me{" "}
        <a href="mailto:a@s.cr">here</a>.
      </p>
    </>
  );
}
