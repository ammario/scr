import { AppProps } from "next/app";
import Head from "next/head";
import Image from "next/image";
import { css, Global } from "@emotion/react";

const globalStyles = css`
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700&display=swap");

  :root {
    --notePadYellow: #fff16b;
    --dreamyTeal: #38a0a3;
    --primaryBlue: #37498b;
    --nightBlack: #151515;
    --redwoodRed: #a63d40;
    --primaryGreen: #198729;
    --friendlyPurple: #c9b2ff;
    --deepPurple: #a32e80;
  }

  @font-face {
    font-family: "Berkeley Mono";
    src: url(/BerkeleyMono-Regular.woff2);
    font-weight: normal;
    font-style: normal;
  }

  button {
    width: auto; // Changed from 100% to auto
    justify-content: center;
    font-size: 14px;
    background-color: var(--primaryBlue);
    color: white;
    min-width: 100px;
    min-height: 30px;
    padding: 0 16px; // Added padding for better appearance
  }

  button:hover {
    filter: brightness(120%);
  }

  .reply-button {
    background-color: var(--dreamyTeal);
  }

  .read-button {
    background-color: #ffa200;
    color: black;
    margin-top: 8px;
    margin-bottom: 8px;
  }

  .read-button:hover {
    background-color: black;
    color: white; // Added for better contrast when hovering
  }

  .frontmatter {
    background: var(--primaryBlue);
    padding: 12px;
    color: white;
  }

  .frontmatter p a {
    color: white;
    font-weight: 400;
  }

  .MuiFormControl-root {
    background-color: white;
  }

  a {
    color: #3b82f6;
    text-decoration: underline;
  }

  h1 {
    font-size: 24px;
    font-weight: bold;
    margin: 0;
  }

  p {
    opacity: 0.64;
    margin-top: 0px;
    font-size: 14px;
    margin-block-end: 4px;
    margin-block-start: 4px;
  }

  .tagline {
    opacity: 1;
  }

  .MuiOutlinedInput-root > textarea {
    font-family: "Berkeley Mono", monospace;
  }

  .MuiTypography-root {
    font-family: "Inter";
  }

  body {
    font-family: "Inter";
    background-color: #f0f0f0;
  }

  #copy-url-box {
    text-align: center;
    background-color: #4d4d4d;
    color: aliceblue;
    padding: 10px;
    resize: none;
    font-weight: bold;
    border-color: black;
    border-style: dotted;
    border-width: 2px;
  }

  .error-box {
    text-align: center;
    padding: 10px;
    background-color: #b30117;
    font-weight: bold;
    color: white;
    border-color: black;
    border-style: solid;
    border-width: 1px;
    margin-bottom: 10px;
  }

  select {
    border-radius: 0px;
    background-color: white;
  }

  .success-box {
    text-align: center;
    padding: 5px;
    background-color: var(--primaryGreen);
    color: white;
    border-color: black;
    border-style: solid;
    border-width: 1px;
  }

  .view-box {
    background-color: #ffffff;
    color: black;
    padding: 10px;
    font-family: "Berkeley Mono", monospace;
    border-color: black;
    border-style: dashed;
    border-width: 2px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .faq-answer {
    padding-bottom: 16px;
  }

  svg.MuiSvgIcon-root {
    width: 20px;
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
          padding: 0 16px;
          max-width: 800px;
        `}
      >
        <Frontmatter />
        <hr
          css={css`
            height: 0;
            color: inherit;
            border: 1px solid #ddd;
          `}
        />
        <Component {...pageProps} />
      </div>
    </>
  );
}
