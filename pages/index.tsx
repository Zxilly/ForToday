// noinspection JSIgnoredPromiseFromCall

import { Box, Container, IconButton, SimpleGrid, Stack } from "@chakra-ui/react";
import { client } from "../constants";
import { PureUserProblemStatus, UserProblemStatus } from "../types/tentacle";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { UserCard } from "../components/UserCard";
import { AnimatePresence, motion } from "framer-motion";
import { GetServerSideProps } from "next";
import { useBoolean, useInterval, useWindowSize } from "react-use";
import { RepeatIcon, TriangleDownIcon } from "@chakra-ui/icons";

export default function Home({
    result
}: {
    result: Record<string, PureUserProblemStatus>;
})
{
    const [data, setData] = useState(result);
    const [start, setStart] = useState(0);
    const { width } = useWindowSize();
    const [autoRefresh, setAutoRefresh] = useBoolean(true);

    const visibleCardCount = useMemo(() =>
    {
        return Math.floor(Math.min(width, 1280) / 300);
    }, [width]);
    const updateInterval = useMemo(() =>
    {
        return 1000 * 10 * visibleCardCount;
    }, [visibleCardCount]);

    const sortedData = useMemo(() =>
    {
        return Object.entries(data)
            .sort(([, st], [_, st2]) => (st.rank || -1) - (st2.rank || -1));
    }, [data]);

    const cards = useMemo(() =>
    {
        return sortedData.map(([name, status]) =>
        {
            return <UserCard key={Math.random().toString()} name={name} status={status}/>;
        });
    }, [sortedData]);

    const visibleCards = useMemo(() =>
    {
        const _cards = [];
        for(let i = start; i < start + visibleCardCount; i++)
        {
            _cards.push(cards[i % cards.length]);
        }
        return _cards;
    }, [start, visibleCardCount, cards]);

    useInterval(async () =>
    {
        const res = await fetch("/api/data");
        if(res.status === 200)
        {
            const data = await res.json();
            setData(data);
        }
    }, autoRefresh ? updateInterval : null);

    useEffect(() =>
    {
        const timerID = setTimeout(() =>
        {
            setStart((start + visibleCardCount) % cards.length);
        }, updateInterval);
        return () => clearTimeout(timerID);
    }, [start, visibleCardCount, cards.length, updateInterval]);

    // const cardIndicator = useMemo(() =>
    // {
    //     const _clips = [];
    //     const shouldRenders = [];
    //     const variants: Variants = {
    //         "active": {
    //             opacity: 1
    //         },
    //         "inactive": {
    //             opacity: 0
    //         }
    //     };
    //     for(let i = start; i < start + visibleCardCount; i++)
    //     {
    //         shouldRenders.push(i % cards.length);
    //     }
    //     for(let i = 0; i < cards.length; i++)
    //     {
    //         const shouldRender = shouldRenders.includes(i);
    //         _clips.push(
    //             <motion.div
    //                 key={Math.random().toString()}
    //                 layout
    //                 variants={variants}
    //                 animate={shouldRender ? "active" : "inactive"}
    //                 transition={{ duration: 0.5 }}
    //                 exit={{ opacity: 0, x: 0 }}
    //             >
    //                 <Box
    //                     className={style.statusClip}
    //                     background={"blue.200"}
    //                 />
    //             </motion.div>);
    //     }
    //     return <AnimatePresence>
    //         <Box className={style.statusClipGroup}>
    //             {_clips}
    //         </Box>
    //     </AnimatePresence>;
    // }, [cards.length, start, visibleCardCount]);

    const toggleAutoRefresh = useCallback(() =>
    {
        setAutoRefresh(!autoRefresh);
    }, [autoRefresh, setAutoRefresh]);

    const goNext = useCallback(() =>
    {
        setStart((start + visibleCardCount) % cards.length);
    }, [start, visibleCardCount, cards.length]);

    return (
        <>
            <Container maxW="container.xl">
                {visibleCardCount === 4 && <Box className={"activeCardIndicator"}>
                    {/*{cardIndicator}*/}
                    <Stack direction={"column"} spacing={2}>
                        <IconButton
                            aria-label={"refresh"}
                            icon={<RepeatIcon/>}
                            variant={autoRefresh ? "solid" : "outline"}
                            onClick={toggleAutoRefresh}
                        />
                        <IconButton
                            aria-label={"next page"}
                            icon={<TriangleDownIcon/>}
                            onClick={goNext}
                        />
                    </Stack>
                </Box>}
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
