import "../styles/globals.css";
import type { AppProps } from "next/app";
import { ChakraProvider } from "@chakra-ui/react";
import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps)
{
    useEffect(() =>
    {
        setTimeout(() =>
        {
            window.location.reload();
        }, 1000 * 60 * 5);
    }, []);

    return (
        <>
            <Head>
                <meta name="referrer" content="never"/>
                <title>Three days</title>
            </Head>
            <ChakraProvider>
                <Component {...pageProps} />
            </ChakraProvider>
            <Analytics/>
        </>
    );
}
