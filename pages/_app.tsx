import { AppProps } from "next/app";
import Head from "next/head";
import Image from "next/image";
import { css, Global } from "@emotion/react";
import { colors, colorMixins } from "../util/theme";

const globalStyles = css`
  /* Imports and Font Faces */
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700&display=swap");

  @font-face {
    font-family: "Berkeley Mono";
    src: url(/BerkeleyMono-Regular.woff2);
    font-weight: normal;
    font-style: normal;
  }

  /* CSS Variables */
  :root {
    --background: ${colors.background};
    --foreground: ${colors.foreground};
    --accent: ${colors.accent};
    --accent-light: ${colors.accentLight};
    --accent-dark: ${colors.accentDark};
    --success: ${colors.success};
    --warning: ${colors.warning};
    --error: ${colors.error};
    --comment: ${colors.comment};
  }

  /* Global Styles */
  body {
    font-family: "Inter", sans-serif;
    background-color: var(--background);
    color: var(--foreground);
  }

  button,
  textarea,
  select {
    border-radius: 2px;
  }

  /* Typography */
  h1 {
    font-size: 24px;
    font-weight: bold;
    margin: 0;
    color: var(--accent-light);
  }

  p {
    opacity: 0.8;
    margin-top: 0px;
    font-size: 14px;
    margin-block-end: 4px;
    margin-block-start: 4px;
  }

  a {
    color: var(--accent-light);
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  textarea {
    background-color: ${colorMixins.textareaBackground};
    color: var(--foreground);
    border: 1px solid var(--accent);
  }

  /* Buttons */
  button {
    width: auto;
    justify-content: center;
    font-size: 14px;
    background-color: var(--accent-dark);
    color: var(--foreground);
    min-width: 100px;
    min-height: 30px;
    padding: 0 16px;
    border: none;
    cursor: pointer;
  }

  button:hover {
    background-color: var(--accent);
  }

  .reply-button {
    background-color: var(--success);
  }

  /* Form Elements */
  select {
    background-color: ${colorMixins.selectBackground};
    color: var(--foreground);
    border: 1px solid var(--accent);
  }

  /* Custom Components */
  .frontmatter {
    background: var(--accent-dark);
    padding: 12px;
    color: var(--foreground);
  }

  .frontmatter p a {
    color: var(--accent-light);
    font-weight: 400;
  }

  .tagline {
    opacity: 1;
  }

  #copy-url-box {
    text-align: center;
    background-color: var(--accent-dark);
    color: var(--foreground);
    padding: 10px;
    resize: none;
    font-weight: bold;
    border: 2px dotted var(--accent);
  }

  .error-box {
    text-align: center;
    padding: 10px;
    background-color: var(--error);
    font-weight: bold;
    color: var(--foreground);
    border: 1px solid var(--accent);
    margin-bottom: 10px;
  }

  .success-box {
    border-radius: 2px;
    text-align: center;
    padding: 5px;
    background-color: var(--success);
    border: 1px solid var(--black);
  }

  .faq-answer {
    padding-bottom: 16px;
  }

  /* Material-UI Overrides */
  .MuiFormControl-root {
    background-color: var(--accent-dark);
  }

  .MuiOutlinedInput-root > textarea {
    font-family: "Berkeley Mono", monospace;
    color: var(--foreground);
  }

  .MuiTypography-root {
    font-family: "Inter", sans-serif;
    color: var(--foreground);
  }

  svg.MuiSvgIcon-root {
    width: 20px;
    color: var(--accent-light);
  }
`;

const Frontmatter = () => {
  return (
    <div
      css={css`
        display: flex;
        flex-direction: row;
        align-items: center;
        margin-bottom: "16px";
        gap: 16px;
      `}
    >
      <a href="/">
        <Image
          width="48"
          height="48"
          alt="Icon"
          className="logo"
          src={"/favicon.ico"}
        ></Image>
      </a>
      <div>
        <h1>
          <a href="/" style={{ color: "inherit", textDecoration: "none" }}>
            s.cr
          </a>
        </h1>
        <p>
          Send encrypted, self-destructing notes.{" "}
          <a href="/about">Learn more.</a>
        </p>
      </div>
    </div>
  );
};

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Global styles={globalStyles} />
      <Head>
        <title>s.cr — encrypted, self-destructing notes</title>
        <meta
          name="description"
          content="Securely send encrypted, self-destructing notes."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>{" "}
      <Head>
        <meta name="viewport" content="width=device-width, user-scalable=no" />
        <meta
          name="description"
          content="Securely send self-destructing notes."
        />
      </Head>
      <div
        css={css`
          margin: 0 auto;
          max-width: 800px;
          width: 100%;
          box-sizing: border-box;
        `}
      >
        <Frontmatter />
        <hr
          css={css`
            height: 0;
            color: inherit;
            border: 1px solid ${colorMixins.hrBackground};
          `}
        />
        <div
          css={css`
            width: 100%;
            box-sizing: border-box;
          `}
        >
          <Component {...pageProps} />
        </div>
      </div>
    </>
  );
}
