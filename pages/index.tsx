// noinspection JSIgnoredPromiseFromCall

import { Box, Container, SimpleGrid } from "@chakra-ui/react";
import { client } from "../constants";
import { PureUserProblemStatus, UserProblemStatus } from "../types/tentacle";
import React, { useState } from "react";
import { UserCard } from "../components/UserCard";
import { AnimatePresence, motion } from "framer-motion";
import { GetServerSideProps } from "next";
import { useInterval, useWindowSize } from "react-use";



export default function Home({
    result
}: {
    result: Record<string, PureUserProblemStatus>;
})
{
    const [data, setData] = useState(result);
    const [start, setStart] = useState(0);
    const { width } = useWindowSize();

    console.log(Math.min(width, 1280));
    const visibleCardCount = Math.floor(Math.min(width, 1280) / 300) ;
    const updateInterval = 1000 * 4 * visibleCardCount;

    const cards = Object.entries(data)
        .sort(([, st], [_, st2]) => (st.rank || -1) - (st2.rank || -1))
        .map(([name, status]) =>
        {
            return <UserCard key={Math.random().toString()} name={name} status={status}/>;
        });

    const visibleCards = [];
    for(let i = start; i < start + visibleCardCount; i++)
    {
        visibleCards.push(cards[i % cards.length]);
    }

    useInterval(async () =>
    {
        const res = await fetch("/api/data");
        if(res.status === 200)
        {
            const data = await res.json();
            setData(data);
        }
    }, updateInterval * 4);

    useInterval(() =>
    {
        setStart((start + visibleCardCount) % cards.length);
    }, updateInterval);


    return (
        <>
            <Container maxW="container.xl">
                <Box m={6} p={6}>
                    <AnimatePresence exitBeforeEnter>
                        <motion.div
                            key={Math.random().toString()}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            transition={{ duration: 1 }}
                        >
                            <SimpleGrid columns={visibleCardCount} spacing={10}>
                                {visibleCards}
                            </SimpleGrid>
                        </motion.div>
                    </AnimatePresence>
                </Box>
            </Container>
        </>
    );
}

export const getServerSideProps: GetServerSideProps = async ({ res }) =>
{
    res.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=60");

    const data = await client.get("data");
    if(!data)
    {
        return {
            props: {
                result: {}
            }
        };
    }
    const result: Record<string, UserProblemStatus> = JSON.parse(data);
    return {
        props: {
            result
        }
    };
};
