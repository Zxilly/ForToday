// noinspection JSIgnoredPromiseFromCall

import { Box, Container, SimpleGrid } from "@chakra-ui/react";
import { client } from "../constants";
import { PureUserProblemStatus, UserProblemStatus } from "../types/tentacle";
import React, { useState } from "react";
import { UserCard } from "../components/UserCard";
import { AnimatePresence, motion } from "framer-motion";

const updateInterval = 1000 * 15;

export default function Home({
    result
}: {
    result: Record<string, PureUserProblemStatus>;
})
{
    const cards = Object.entries(result)
        .sort(([, st], [_, st2]) => (st.rank || -1) - (st2.rank || -1))
        .map(([name, status]) =>
        {
            return <UserCard key={Math.random().toString()} name={name} status={status}/>;
        });

    // select 4 from cards
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

    setTimeout(updateCard, updateInterval);

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

export async function getServerSideProps()
{
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
}
