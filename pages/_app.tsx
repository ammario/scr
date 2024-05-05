import { AppProps } from "next/app";
import "../styles/globals.scss";
import Head from "next/head";
import Image from "next/image";
import { css } from "@emotion/react";

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
        style={{
          maxWidth: "800px",
        }}
      >
        <span
          css={css`
            display: "flex";
            align-items: "center";
            margin-bottom: "16px";
          `}
        >
          <div className="">
            <a href="/">
              <Image
                width="48"
                height="48"
                alt="Icon"
                className="logo"
                src={"/favicon.ico"}
              ></Image>
            </a>
            <div className="ml-3">
              <h1>
                <a
                  href="/"
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  s.cr
                </a>
              </h1>
              <p>
                Send encrypted, self-destructing notes.{" "}
                <a href="/about">Learn more.</a>
              </p>
            </div>
          </div>
        </span>

        <hr style={{ marginTop: "12px", marginBottom: "16px" }} />
        <Component {...pageProps} />
      </div>
    </>
  );
}
