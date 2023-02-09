import "@/styles/globals.css";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import createTheme from "@mui/material/styles/createTheme";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
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
      <Component {...pageProps} />
    </>
  );
}
