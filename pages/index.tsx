// noinspection JSIgnoredPromiseFromCall

import { Box, Container, IconButton, SimpleGrid, Stack, Tooltip, useToast } from "@chakra-ui/react";
import { PureUserProblemStatus, UserProblemStatus } from "../types/tentacle";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UserCard } from "../components/UserCard";
import { AnimatePresence, motion } from "framer-motion";
import { GetServerSideProps } from "next";
import { useInterval } from "react-use";
import { RepeatIcon, SpinnerIcon, TriangleDownIcon } from "@chakra-ui/icons";
import TokenDialog from "../components/TokenDialog";
import { getNewTimedLogger, readData } from "../utils/utils";
import { client } from "../constants";

export default function Home({
    result
}: {
    result: Record<string, PureUserProblemStatus>;
})
{
    const [data, setData] = useState(result);
    const [start, setStart] = useState(0);

    const [refreshLoading, setRefreshLoading] = useState(false);
    const [nextPageLoading, setNextPageLoading] = useState(false);

    const toast = useToast();

    const lastClick = useRef<number>(Date.now());

    const [visibleCardCount, setVisibleCardCount] = useState(1);

    useEffect(() =>
    {
        setVisibleCardCount(Math.floor(Math.min(window.innerWidth, 1280) / 300));

        const onResize = () =>
        {
            setVisibleCardCount(Math.floor(Math.min(window.innerWidth, 1280) / 300));
        };
        window.addEventListener("resize", onResize);

        return () =>
        {
            window.removeEventListener("resize", onResize);
        };
    }, []);

    const updateInterval = useMemo(() =>
    {
        return 1000 * 5 * visibleCardCount;
    }, [visibleCardCount]);

    const sortedData = useMemo(() =>
    {
        return Object.entries(data);
    }, [data]);

    const cards = useMemo(() =>
    {
        return sortedData.map(([name, status]) =>
        {
            return <UserCard key={name} name={name} status={status} />;
        });
    }, [sortedData]);

    const visibleCards = useMemo(() =>
    {
        const _cards = [];
        for(let i = start; i < start + visibleCardCount; i++)
        {
            _cards.push(cards[i % cards.length]);
            if(_cards.length >= cards.length)
            {
                break;
            }
        }
        return _cards;
    }, [start, visibleCardCount, cards]);

    const refresh = useCallback(async () =>
    {
        if(refreshLoading)
        {
            return;
        }

        setRefreshLoading(true);
        const res = await fetch("/api/data");
        if(res.status === 200)
        {
            const data = await res.json();
            setData(data);
        }
        setRefreshLoading(false);
    }, [refreshLoading]);

    useInterval(async () =>
    {
        await refresh();
    }, updateInterval * 4);

    useEffect(() =>
    {
        const timerID = setTimeout(() =>
        {
            setStart((start + visibleCardCount) % cards.length);
        }, updateInterval);
        return () => clearTimeout(timerID);
    }, [start, visibleCardCount, cards.length, updateInterval]);

    const goNext = useCallback(() =>
    {
        setStart((start + visibleCardCount) % cards.length);
        lastClick.current = Date.now();
        setNextPageLoading(true);
        setTimeout(() =>
        {
            setNextPageLoading(false);
        }, 2000);
    }, [start, visibleCardCount, cards.length]);

    return (
        <>
            <TokenDialog />
            <Container maxW="container.xl">
                {visibleCardCount !== 1 && <Box className={"activeCardIndicator"}>
                    <Stack direction={"column"} spacing={6}>
                        <UpdateButton />
                        <Stack direction={"column"} spacing={2}>
                            <Tooltip label="刷新" placement="right">
                                <IconButton
                                    isLoading={refreshLoading}
                                    aria-label={"refresh"}
                                    icon={<RepeatIcon />}
                                    variant={"solid"}
                                    onClick={async () =>
                                    {
                                        await refresh();
                                        toast({
                                            title: "刷新成功",
                                            status: "success",
                                            duration: 2000,
                                            isClosable: true,
                                            position: "top"

                                        });
                                    }}
                                />
                            </Tooltip>
                            <Tooltip label="下一页" placement="right">
                                <IconButton
                                    isLoading={nextPageLoading}
                                    aria-label={"next page"}
                                    icon={<TriangleDownIcon />}
                                    onClick={goNext}
                                />
                            </Tooltip>
                        </Stack>
                    </Stack>
                </Box>}
                <Box m={6} p={6}>
                    <AnimatePresence
                        mode="wait">
                        <motion.div
                            key={`cards-${start}`}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            transition={{ duration: 1 }}
                        >
                            <SimpleGrid columns={Math.min(visibleCardCount, visibleCards.length)} spacing={10}>
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

    const logger = getNewTimedLogger();
    const data = await readData(client, logger);
    console.info(logger("getResult"));
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

const UpdateButton: React.FC = () =>
{
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    return <Tooltip label="重新爬取" placement="right">
        <IconButton
            aria-label={"update"}
            icon={<SpinnerIcon />}
            isLoading={loading}
            onClick={() =>
            {
                if(!loading)
                {
                    setLoading(true);
                    fetch("/api/refresh", {
                        method: "POST"
                    })
                        .then((r) =>
                        {
                            setLoading(false);
                            toast({
                                title: "更新成功",
                                status: "success",
                                duration: 2000,
                                position: "top"
                            });

                            r.json().then((data) =>
                            {
                                console.log(data.log);
                            });
                        });
                }
            }}
        />
    </Tooltip>;
};
