// noinspection JSIgnoredPromiseFromCall

import {
	Box,
	Container,
	IconButton,
	SimpleGrid,
	Stack,
	Tooltip,
	useToast,
} from "@chakra-ui/react";
import { PureUserProblemStatus } from "../types/tentacle";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { UserCard } from "../components/UserCard";
import { AnimatePresence, motion } from "framer-motion";
import { GetServerSideProps } from "next";
import { useInterval, useWindowSize } from "react-use";
import { RepeatIcon, SpinnerIcon, TriangleDownIcon } from "@chakra-ui/icons";
import TokenDialog from "../components/TokenDialog";
import { getNewTimedLogger, readData } from "../utils/utils";
import { client } from "../constants";
import NoSSR from "../components/NoSSR";

interface HomeProps {
	result: Record<string, PureUserProblemStatus>;
}

function Home({ result }: HomeProps) {
	const [data, setData] = useState(result);
	const [start, setStart] = useState(0);

	const [refreshLoading, setRefreshLoading] = useState(false);
	const [nextPageLoading, setNextPageLoading] = useState(false);

	const nextTimer = useRef<number | null>(null);

	const toast = useToast();

	const { width } = useWindowSize();

	const visibleCardCount = useMemo(() => {
		return Math.floor(Math.min(width, 1280) / 300);
	}, [width]);

	const displayCardCount = useMemo(() => {
		return Math.min(visibleCardCount, Object.keys(data).length);
	}, [data, visibleCardCount]);

	const updateInterval = useMemo(() => {
		return 1000 * 5 * displayCardCount;
	}, [displayCardCount]);

	const sortedData = useMemo(() => {
		return Object.entries(data);
	}, [data]);

	const cards = useMemo(() => {
		return sortedData.map(([name, status]) => {
			return <UserCard key={name} name={name} status={status} />;
		});
	}, [sortedData]);

	const visibleCards = useMemo(() => {
		const _cards = [];
		for (let i = start; i < start + displayCardCount; i++) {
			_cards.push(cards[i % cards.length]);
			if (_cards.length >= cards.length) {
				break;
			}
		}
		return _cards;
	}, [start, displayCardCount, cards]);

	const refresh = useCallback(async () => {
		if (refreshLoading) {
			return;
		}

		setRefreshLoading(true);
		const res = await fetch("/api/data");
		if (res.status === 200) {
			const data = await res.json();
			setData(data);
		}
		setRefreshLoading(false);
	}, [refreshLoading]);

	useInterval(async () => {
		await refresh();
	}, updateInterval * 8);

	const goNext = useCallback(() => {
		setStart((start + displayCardCount) % cards.length);
	}, [start, displayCardCount, cards.length]);

	const resetNextTimer = useCallback(() => {
		if (nextTimer.current !== null) {
			clearTimeout(nextTimer.current);
		}
		nextTimer.current = window.setTimeout(() => {
			goNext();
		}, updateInterval);
	}, [goNext, updateInterval]);

	useEffect(() => {
		resetNextTimer();
	}, [resetNextTimer]);

	const onAnimateEnter = useCallback(() => {
		setNextPageLoading(true);
	}, []);

	const onAnimateExit = useCallback(() => {
		setNextPageLoading(false);
	}, []);

	return (
		<NoSSR>
			<TokenDialog />
			<Container
				width={"calc(100vw - 2rem)"}
				height={"100%"}
				maxW="container.xl">
				{visibleCardCount !== 1 && (
					<Box className={"activeCardIndicator"}>
						<Stack direction={"column"} spacing={6}>
							<UpdateButton />
							<Stack direction={"column"} spacing={2}>
								<Tooltip label="刷新" placement="right">
									<IconButton
										isLoading={refreshLoading}
										aria-label={"refresh"}
										icon={<RepeatIcon />}
										variant={"solid"}
										onClick={() => {
											refresh()
												.then(() => {
													toast({
														title: "刷新成功",
														status: "success",
														duration: 2000,
														isClosable: true,
														position: "top",
													});
												})
												.catch(() => {
													toast({
														title: "刷新失败",
														status: "error",
														duration: 2000,
														isClosable: true,
														position: "top",
													});
												});
										}}
									/>
								</Tooltip>
								<Tooltip label="下一页" placement="right">
									<IconButton
										isLoading={nextPageLoading}
										aria-label={"next page"}
										icon={<TriangleDownIcon />}
										onClick={() => {
											goNext();
											resetNextTimer();
										}}
									/>
								</Tooltip>
							</Stack>
						</Stack>
					</Box>
				)}
				<Box m={6} p={6}>
					<AnimatePresence
						initial={false}
						mode="popLayout"
					>
						<motion.div
							key={`cards-${start}`}
							initial={{ y: 0, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							exit={{ y: 0, opacity: 0 }}
							transition={{ duration: 2 }}
							onAnimationStart={onAnimateEnter}
							onAnimationComplete={onAnimateExit}
						>
							<SimpleGrid columns={displayCardCount} spacing={10}>
								{visibleCards}
							</SimpleGrid>
						</motion.div>
					</AnimatePresence>
				</Box>
			</Container>
		</NoSSR>
	);
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async ({
	res,
}) => {
	res.setHeader(
		"Cache-Control",
		"public, s-maxage=15, stale-while-revalidate=60",
	);

	const logger = getNewTimedLogger();
	const data = await readData(client, logger);
	console.info(logger("getResult"));
	if (!data) {
		return {
			props: {
				result: {},
			},
		};
	}
	const result: Record<string, PureUserProblemStatus> = JSON.parse(data);
	return {
		props: {
			result,
		},
	};
};

const UpdateButton: React.FC = () => {
	const [loading, setLoading] = useState(false);
	const toast = useToast();

	return (
		<Tooltip label="重新爬取" placement="right">
			<IconButton
				aria-label={"update"}
				icon={<SpinnerIcon />}
				isLoading={loading}
				onClick={() => {
					if (!loading) {
						setLoading(true);
						fetch("/api/refresh", {
							method: "POST",
						}).then((r) => {
							setLoading(false);
							toast({
								title: "更新成功",
								status: "success",
								duration: 2000,
								position: "top",
							});

							r.json().then((data) => {
								console.log(data.log);
							});
						});
					}
				}}
			/>
		</Tooltip>
	);
};

export default Home;
