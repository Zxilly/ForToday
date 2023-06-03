import { Box, Link } from "@chakra-ui/react";
import { groupBy, rankColor } from "../utils/utils";
import { PureUserProblemStatus, SuccessProblem, UserProblemStatus } from "../types/tentacle";
import React from "react";
import Lottie from "lottie-react";
import animationA from "../animation/A.json";
import animationB from "../animation/B.json";

export type UserCardProps = {
    name: string;
    status: PureUserProblemStatus;
};

export function UserCard(props: UserCardProps): JSX.Element
{
    const { name, status } = props;
    const color = status.rank !== undefined && status.rank >= 0 ? rankColor(status.rank) : "black";

    const pickAnimation = (status.rank + 1) % 2 === 0 ? animationA : animationB;

    return (
        <Box
            padding={4}
            key={name}
            borderWidth="3px"
            borderRadius="lg"
            borderColor={color}
            overflow="hidden"
            style={{
                background: `linear-gradient(250deg, ${color} 2rem, var(--chakra-colors-chakra-body-bg) 0)`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start"
            }}
        >
            <Box
                mt="1"
                fontWeight="semibold"
                fontSize="xl"
                as="h1"
                lineHeight="tight"
                noOfLines={1}
                color={color}
            >
                {name}
            </Box>
            <Box
                flexGrow="1"
                display="flex"
                flexDirection="column"
            >
                <div>
                    <Box as="span" fontSize="4rem">
                        {status.pass.length}
                    </Box>
                    <Box as="span" fontSize="3rem" m={2}>
                        /
                    </Box>
                    <Box as="span" color="gray.600" fontSize="2rem">
                        {status.pass.length + status.failed.length}
                    </Box>
                    <Box as="span" color="gray.600" m={1} fontSize="1.5rem">
                        ({status.submitted})
                    </Box>
                </div>
                {status.submitted !== 0 && groupBy(
                    UserProblemStatus.fromObject(status).getAll(),
                    (x: SuccessProblem) => x.contest
                ).map((group, i) =>
                {
                    return (
                        <ProblemGroup key={`${name}-${i}`} problems={group} />
                    );
                })}
                {status.submitted === 0 && (
                    <Box fontSize="1.5rem" style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "1rem",
                        flexGrow: 1
                    }}>
                        <Lottie animationData={pickAnimation} />
                    </Box>
                )}
            </Box>
        </Box>
    );
}

function ProblemGroup({
    problems
}: {
    problems: SuccessProblem[];
}): JSX.Element
{
    if(problems.length === 0)
    {
        return <></>;
    }
    problems.sort((a, b) => a.title.localeCompare(b.title));

    return (
        <div>
            <div>
                <Box
                    as="span"
                    color={"gray.500"}
                    fontSize="0.85rem"
                >{`${problems[0].platform} ${problems[0].contest}`}</Box>
            </div>
            {problems.map((problem) =>
            {
                return (
                    <div key={`${problem.id}`}>
                        <Link href={problem.url} isExternal>
                            <Box
                                as="span"
                                className={"codeStyle"}
                                color={problem.success ? "green.500" : "red.500"}
                                fontSize="1rem"
                            >
                                {problem.title}
                            </Box>
                        </Link>
                    </div>
                );
            })}
        </div>
    );
}
