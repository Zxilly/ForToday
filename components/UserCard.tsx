import { Box, Link } from "@chakra-ui/react";
import { groupBy, rankColor } from "../utils/utils";
import { PureUserProblemStatus, SuccessProblem, UserProblemStatus } from "../types/tentacle";
import React from "react";

export type UserCardProps = {
    name: string;
    status: PureUserProblemStatus;
};

export function UserCard(props: UserCardProps): JSX.Element
{
    const { name, status } = props;
    const color = status.rank !== undefined && status.rank >= 0 ? rankColor(status.rank) : "black";
    return (
        <Box
            padding={4}
            key={name}
            maxW="sm"
            borderWidth="3px"
            borderRadius="lg"
            borderColor={color}
            overflow="hidden"
            style={{
                background: `linear-gradient(250deg, ${color} 2rem, var(--chakra-colors-chakra-body-bg) 0)`
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
            <Box>
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
                {groupBy(
                    UserProblemStatus.fromObject(status).getAll(),
                    (x: SuccessProblem) => x.contest
                ).map((group) =>
                {
                    return (
                        <ProblemGroup key={Math.random().toString()} problems={group}/>
                    );
                })}
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
                    <div key={Math.random().toString()}>
                        <Link href={problem.url} isExternal>
                            <Box
                                as="span"
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
