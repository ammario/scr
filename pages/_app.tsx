import { AppProps } from "next/app";
import "../styles/globals.scss";
import Head from "next/head";
import Image from "next/image";
import { css } from "@emotion/react";

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
          style={{
            height: 0,
            color: "inherit",
            border: "1px solid #ddd",
          }}
        />
        <Component {...pageProps} />
      </div>
    </>
  );
}
