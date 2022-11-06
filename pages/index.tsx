// noinspection JSIgnoredPromiseFromCall

import { Box, Container, SimpleGrid } from "@chakra-ui/react";
import { client } from "../constants";
import { PureUserProblemStatus, UserProblemStatus } from "../types/tentacle";
import React from "react";
import { UserCard } from "../components/UserCard";

export default function Home({
    result,
}: {
    result: Record<string, PureUserProblemStatus>;
})
{
    return (
        <Container maxW="container.xl">
            <Box m={6} p={6} borderWidth="1px" borderRadius="lg">
                <SimpleGrid columns={4} spacing={10}>
                    {Object.entries(result)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([name, status]) =>
                        {
                            return UserCard({ name, status });
                        })}
                </SimpleGrid>
            </Box>
        </Container>
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
        },
    };
}
