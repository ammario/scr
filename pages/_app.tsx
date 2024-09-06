import { AppProps } from "next/app";
import Head from "next/head";
import { css, Global } from "@emotion/react";
import {
  colors,
  colorMixins,
  borderRadius,
  buttonBorderRadius,
} from "../util/theme";

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

  textarea {
    border-radius: ${borderRadius};
  }

  button,
  select {
    border-radius: ${buttonBorderRadius};
  }

  /* Typography */
  h1 {
    font-size: 24px;
    font-weight: bold;
    margin: 0;
    color: ${colors.h1};
  }

  p {
    opacity: 0.8;
    margin-top: 0px;
    font-size: 14px;
    margin-block-end: 0px;
    margin-block-start: 0px;
  }

  a {
    color: var(--accent-light);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 2px;
  }

  a:hover {
    text-decoration: underline;
  }

  textarea {
    background-color: ${colorMixins.textareaBackground};
    color: var(--foreground);
    border: 1px solid var(--accent);
  }

  label {
    font-size: 12px;
    margin-left: 2px;
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
    padding: 2px;
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

  .success-box {
    border-radius: ${borderRadius};
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
    color: white;
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
      <div>
        <h1>
          <a href="/" style={{ color: "inherit", textDecoration: "none" }}>
            s.cr
          </a>
        </h1>
        <div
          css={css`
            display: flex;
            flex-direction: column;
          `}
        >
          <p
            css={css`
              margin-bottom: 0px;
            `}
          >
            Send encrypted, self-destructing notes.
          </p>
          <div
            css={css`
              display: flex;
              flex-direction: row;
              gap: 16px;
              font-size: 12px;
              margin-top: 8px;
            `}
          >
            <a href="/about">About</a>
            <a target="_blank" href="https://github.com/ammario/scr">
              View Source
            </a>
          </div>
        </div>
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
