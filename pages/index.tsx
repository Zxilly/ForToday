// noinspection JSIgnoredPromiseFromCall

import {Box, Container, SimpleGrid} from '@chakra-ui/react'
import {client} from "../constants";
import {ProblemStatus} from "../types/tentacle";
export default function Home({result}: { result: Record<string, ProblemStatus> }) {
    return (
        <Container maxW="container.xl">
            <SimpleGrid columns={4} spacing={10}>
                {Object.entries(result).map(([name, status]) => {
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
                            <Box as='span' fontSize='6rem'>
                                {status.pass.length}
                            </Box>
                            <Box as='span' fontSize='4rem' m={2}>
                                /
                            </Box>
                            <Box as='span' color='gray.600' fontSize='3rem'>
                                {status.pass.length + status.failed.length}
                            </Box>
                            <Box as='span' color='gray.600' m={1} fontSize='1.5rem'>
                                ({status.submitted})
                            </Box>
                            {
                                status.failed.map((problem) => {
                                    return <Box key={problem} as='div' color='red.500' fontSize='1rem'>
                                        {problem}
                                    </Box>
                                })
                            }
                            {
                                status.pass.map((problem) => {
                                    return <Box key={problem} as='div' color='green.500' fontSize='1rem'>
                                        {problem}
                                    </Box>
                                })
                            }
                        </Box>
                    </Box>
                })}
            </SimpleGrid>
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
    const result: Record<string, ProblemStatus> = JSON.parse(data)
    return {
        props: {
            result
        },
    }
}
