import '../styles/globals.css'
import type {AppProps} from 'next/app'
import {ChakraProvider} from '@chakra-ui/react'
import {useEffect} from "react";


export default function App({Component, pageProps}: AppProps) {
    useEffect(() => {
        setTimeout(() => {
            window.location.reload()
        }, 1000 * 60 * 5)
    }, [])

    return <ChakraProvider>
        <Component {...pageProps} />
    </ChakraProvider>
}
