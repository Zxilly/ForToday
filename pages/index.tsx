// noinspection JSIgnoredPromiseFromCall

import {Box, Container, Link, SimpleGrid} from '@chakra-ui/react'
import {client} from "../constants";
import {SuccessProblem, UserProblemStatus} from "../types/tentacle";
import MD5 from 'crypto-js/md5';
import React from "react";
import {groupBy} from "../utils/utils";

export default function Home({result}: { result: Record<string, UserProblemStatus> }) {
    return (
        <Container maxW="container.xl">
            <Box
                m={6}
                p={6}
                borderWidth='1px'
                borderRadius='lg'>
                <SimpleGrid columns={4} spacing={10}>
                    {Object.entries(result).sort(
                        ([a,], [b,]) => a.localeCompare(b)
                    ).map(([name, status]) => {
                        return <Box
                            padding={4}
                            key={name}
                            maxW='sm'
                            borderWidth='1px'
                            borderRadius='lg'
                            overflow='hidden'>
                            <Box
                                mt='1'
                                fontWeight='semibold'
                                fontSize='xl'
                                as='h1'
                                lineHeight='tight'
                                noOfLines={1}
                            >
                                {name}
                            </Box>
                            <Box>
                                <Box as='span' fontSize='4rem'>
                                    {status.pass.length}
                                </Box>
                                <Box as='span' fontSize='3rem' m={2}>
                                    /
                                </Box>
                                <Box as='span' color='gray.600' fontSize='2rem'>
                                    {status.pass.length + status.failed.length}
                                </Box>
                                <Box as='span' color='gray.600' m={1} fontSize='1.5rem'>
                                    ({status.submitted})
                                </Box>
                                {
                                    groupBy(UserProblemStatus.fromObject(status).getAll(), (x: SuccessProblem) => x.contest).map((group) => {
                                        return <ProblemGroup key={Math.random().toString()} problems={group}/>
                                    })
                                }
                            </Box>
                        </Box>
                    })}
                </SimpleGrid>
            </Box>
        </Container>
    )
}

export async function getServerSideProps() {
    const data = await client.get('data')
    if (!data) {
        return {
            props: {
                result: {}
            }
        }
    }
    const result: Record<string, UserProblemStatus> = JSON.parse(data)
    return {
        props: {
            result
        },
    }
}

function ProblemGroup({
                          problems,
                      }: { problems: SuccessProblem[] }): JSX.Element {
    if (problems.length === 0) {
        return <></>
    }
    problems.sort((a, b) => a.title.localeCompare(b.title))

    return <div>
        <div><Box as='span' color={'gray.500'}
                  fontSize='0.5rem'>{`${problems[0].platform} ${problems[0].contest}`}</Box></div>
        {
            problems.map((problem) => {
                return <div key={MD5(problem.id).toString()}>
                    <Link href={problem.url} isExternal>
                        <Box as='span' color={problem.success ? 'green.500' : 'red.500'} fontSize='1rem'>
                            {problem.title}
                        </Box>
                    </Link>
                </div>
            })
        }
    </div>
}
