// noinspection JSIgnoredPromiseFromCall

import { Box, Container, SimpleGrid } from "@chakra-ui/react";
import { client } from "../constants";
import { PureUserProblemStatus, UserProblemStatus } from "../types/tentacle";
import React, { useEffect, useState } from "react";
import { UserCard } from "../components/UserCard";
import { AnimatePresence, motion } from "framer-motion";
import { GetServerSideProps } from "next";

const updateInterval = 1000 * 15;

export default function Home({
    result
}: {
    result: Record<string, PureUserProblemStatus>;
})
{
    const [data, setData] = useState(result);

    const cards = Object.entries(data)
        .sort(([, st], [_, st2]) => (st.rank || -1) - (st2.rank || -1))
        .map(([name, status]) =>
        {
            return <UserCard key={Math.random().toString()} name={name} status={status}/>;
        });

    const visibleCards = [];

    const [start, setStart] = useState(0);
    for(let i = start; i < start + 4; i++)
    {
        visibleCards.push(cards[i % cards.length]);
    }

    async function updateCard()
    {
        setStart((start + 4) % cards.length);
    }


    useEffect(() =>
    {
        setInterval(updateCard, updateInterval);
        setInterval(async () =>
        {
            const res = await fetch("/api/data");
            if(res.status === 200)
            {
                const data = await res.json();
                setData(data);
            }
        }, updateInterval * 4);
    }, []);

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
                            <SimpleGrid columns={4} spacing={10}>
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
    res.setHeader("Cache-Control", "public, s-maxage=5, stale-while-revalidate=300");

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
