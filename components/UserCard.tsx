import { Box, Link, Tooltip } from "@chakra-ui/react";
import { groupBy, ratingColor } from "../utils/utils";
import {
	ProblemWithStatus,
	PureUserProblemStatus,
	UserProblemStatus,
} from "../types/tentacle";
import React, { useCallback, useEffect } from "react";
import Lottie from "lottie-react";
import animationA from "../animation/A.json";
import animationB from "../animation/B.json";
import animationC from "../animation/C.json";
import { targets } from "../constant/consts";

export type UserCardProps = {
	name: string;
	status: PureUserProblemStatus;
};

export function UserCard(props: UserCardProps): React.JSX.Element {
	const { name, status } = props;
	const color =
		status.level !== undefined && status.level >= 0
			? ratingColor(status.level)
			: "black";

	const [animation, setAnimation] = React.useState<any>(animationA);
	useEffect(() => {
		switch ((status.level + 1) % 3) {
			case 0:
				setAnimation(animationA);
				break;
			case 1:
				setAnimation(animationB);
				break;
			case 2:
				setAnimation(animationC);
				break;
		}
	}, [status.level]);

	const getNameElement = useCallback((name: string) => {
		const cfName = targets.find((x) => x.name === name)!.accounts
			.codeforces;

		return (
			<Link href={`https://codeforces.com/profile/${cfName}`} isExternal>
				<Box as="span" fontWeight="semibold" fontSize="xl">
					{name}
				</Box>
			</Link>
		);
	}, []);

	return (
		<Box
			padding={4}
			key={name}
			borderWidth="3px"
			borderRadius="lg"
			borderColor={color}
			overflow="hidden"
			style={{
				background: `linear-gradient(250deg, ${color} 4rem, var(--chakra-colors-chakra-body-bg) 0)`,
				display: "flex",
				flexDirection: "column",
				justifyContent: "flex-start",
				position: "relative",
			}}
		>
			<Box mt="1" as="div" lineHeight="tight" noOfLines={1} color={color}>
				{getNameElement(name)}
			</Box>
			{status.rating >= 0 && (
				<Box
					style={{
						position: "absolute",
						top: "2rem",
						right: "0",
						transform: "rotate(70deg)",
						fontSize: "1.5rem",
						fontWeight: "bold",
						color: "white",
					}}
				>
					{status.rating}
				</Box>
			)}

			<Box flexGrow="1" display="flex" flexDirection="column">
				<div>
					<Tooltip label={"通过题目数"} placement="bottom">
						<Box as="span" fontSize="4rem">
							{status.pass.length}
						</Box>
					</Tooltip>
					<Box as="span" fontSize="3rem" m={2}>
						/
					</Box>
					<Tooltip label={"尝试题目数"} placement="bottom">
						<Box as="span" color="gray.600" fontSize="2rem">
							{status.pass.length + status.failed.length}
						</Box>
					</Tooltip>
					<Tooltip label={"尝试数"} placement="bottom">
						<Box as="span" color="gray.600" m={1} fontSize="1.5rem">
							({status.submitted})
						</Box>
					</Tooltip>
				</div>
				{status.submitted !== 0 && (
					<Box
						height="50vh"
						overflowY="auto"
						style={{
							scrollbarWidth: "thin",
						}}
					>
						{groupBy(
							UserProblemStatus.fromObject(status).getAll(),
							(x: ProblemWithStatus) =>
								`${x.platform}-${x.contest}`,
						)
							.sort((a, b) => {
								const ap = a[0];
								const bp = b[0];
								return `${ap.platform}-${ap.contest}`.localeCompare(
									`${bp.platform}-${bp.contest}`,
								);
							})
							.map((group, i) => {
								return (
									<ProblemGroup
										key={`${name}-${i}`}
										problems={group}
									/>
								);
							})}
					</Box>
				)}
				{status.submitted === 0 && (
					<Box
						fontSize="1.5rem"
						height="50vh"
						style={{
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
							padding: "1rem",
							flexGrow: 1,
						}}
					>
						<Lottie animationData={animation} />
					</Box>
				)}
			</Box>
		</Box>
	);
}

function ProblemGroup({
	problems,
}: {
	problems: ProblemWithStatus[];
}): React.JSX.Element {
	if (problems.length === 0) {
		return <></>;
	}
	problems.sort((a, b) => a.title.localeCompare(b.title));

	const name = `${problems[0].platform} ${problems[0].contest}`;

	const contest =
		problems[0].contestUrl === undefined ? (
			<>{name}</>
		) : (
			<Link href={problems[0].contestUrl} isExternal>
				{name}
			</Link>
		);

	return (
		<div>
			<div>
				<Box as="span" color={"gray.500"} fontSize="0.85rem">
					{contest}
				</Box>
			</div>
			<Box>
				{problems.map((problem) => {
					return (
						<div key={`${problem.id}`}>
							<Link href={problem.problemUrl} isExternal>
								<Box
									as="span"
									className={"codeStyle"}
									color={
										problem.success
											? "green.500"
											: "red.500"
									}
									fontSize="1rem"
								>
									{problem.title}
								</Box>
							</Link>
						</div>
					);
				})}
			</Box>
		</div>
	);
}
