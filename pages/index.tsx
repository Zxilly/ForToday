// noinspection JSIgnoredPromiseFromCall

import {
    Box, Container,
    IconButton, SimpleGrid,
    Stack,
    Tooltip,
    useToast
} from "@chakra-ui/react";
import { client } from "../constants";
import { PureUserProblemStatus, UserProblemStatus } from "../types/tentacle";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UserCard } from "../components/UserCard";
import { AnimatePresence, motion } from "framer-motion";
import { GetServerSideProps } from "next";
import { useInterval, useWindowSize } from "react-use";
import { RepeatIcon, SpinnerIcon, TriangleDownIcon } from "@chakra-ui/icons";
import TokenDialog from "../components/TokenDialog";

export default function Home({
    result
}: {
    result: Record<string, PureUserProblemStatus>;
})
{
    const [data, setData] = useState(result);
    const [start, setStart] = useState(0);
    const { width } = useWindowSize();
    const toast = useToast();

    const lastClick = useRef<number>(Date.now() - 2000);

    const visibleCardCount = useMemo(() =>
    {
        return Math.floor(Math.min(width, 1280) / 300);
    }, [width]);
    const updateInterval = useMemo(() =>
    {
        return 1000 * 5 * visibleCardCount;
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

    const refresh = useCallback(async () =>
    {
        const res = await fetch("/api/data");
        if(res.status === 200)
        {
            const data = await res.json();
            setData(data);
        }
    }, []);

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
        if(Date.now() - lastClick.current >= 2000)
        {
            setStart((start + visibleCardCount) % cards.length);
            lastClick.current = Date.now();
        }
    }, [start, visibleCardCount, cards.length]);

    return (
        <>
            <TokenDialog/>
            <Container maxW="container.xl">
                {visibleCardCount !== 1 && <Box className={"activeCardIndicator"}>
                    <Stack direction={"column"} spacing={6}>
                        <UpdateButton/>
                        <Stack direction={"column"} spacing={2}>
                            <Tooltip label="刷新" placement="right">
                                <IconButton
                                    aria-label={"refresh"}
                                    icon={<RepeatIcon/>}
                                    variant={"solid"}
                                    onClick={async () =>
                                    {
                                        await refresh();
                                        toast({
                                            title: "刷新成功",
                                            status: "success",
                                            duration: 2000,
                                            isClosable: true,
                                            position: "top",

                                        });
                                    }}
                                />
                            </Tooltip>
                            <Tooltip label="下一页" placement="right">
                                <NextPageButton onClick={goNext}/>
                            </Tooltip>
                        </Stack>
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

const UpdateButton: React.FC = () =>
{
    const [loading, setLoading] = useState(false);
    const toast = useToast();

    return <Tooltip label="重新爬取" placement="right">
        <IconButton
            aria-label={"update"}
            icon={<SpinnerIcon/>}
            isLoading={loading}
            onClick={() =>
            {
                if(!loading)
                {
                    setLoading(true);
                    fetch("/api/refresh")
                        .then(() =>
                        {
                            setLoading(false);
                            toast({
                                title: "更新成功",
                                status: "success",
                                duration: 2000,
                                position: "top"
                            });
                        });
                }
            }}
        />
    </Tooltip>;
};


const NextPageButton: React.FC<{ onClick: () => void }> = ({ onClick }) =>
{
    const [loading, setLoading] = useState(false);

    return <IconButton
        aria-label={"next page"}
        icon={<TriangleDownIcon/>}
        isLoading={loading}
        onClick={() =>
        {
            setLoading(true);
            onClick();
            setTimeout(() => setLoading(false), 2000);
        }}
    />;
};
