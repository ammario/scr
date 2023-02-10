import "../styles/globals.scss";
import type { AppProps } from "next/app";
import Head from "next/head";
import createTheme from "@mui/material/styles/createTheme";
import Link from "next/link";
import Image from "next/image";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>s.cr — encrypted, disposable notes</title>
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
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <link
          href="https://fonts.cdnfonts.com/css/jetbrains-mono"
          rel="stylesheet"
        />
      </Head>
      <div
        className="site-container h-screen w-screen flex flex-col md:container sm:px-12 md:px-120 md:mx-auto p-3 md:py-8 lg:px-100"
        style={{
          maxWidth: "700px",
        }}
      >
        <span className="frontmatter">
          <div className="flex items-center mb-2">
            <a href="/">
              <Image
                width="48"
                height="48"
                alt="Icon"
                src={"/favicon.ico"}
              ></Image>
            </a>
            <div className="ml-3">
              <h1>
                <a href="/" style={{ color: "black" }}>
                  s.cr
                </a>
              </h1>
              <p>Send encrypted, disposable notes</p>
            </div>
          </div>
          <p className="tagline mt-3">
            s.cr encrypts your note in your browser, so our server has no
            information about its content. All notes expire after a period of
            time, defaulting to 24 hours.
          </p>
        </span>

        <hr style={{ marginTop: "12px", marginBottom: "16px" }} />
        <Component {...pageProps} />
      </div>
    </>
  );
}
