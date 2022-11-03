// noinspection JSIgnoredPromiseFromCall

import {Box, Container, SimpleGrid} from '@chakra-ui/react'

interface Result {
    name: string,
    successProblems: string[],
    failedProblems: string[],
}

const targets = ["GlenBzc", "Algor_", "hirsute", "suidingyunmeinv"]

export default function Home({results}: { results: Result[] }) {
    return (
        <Container maxW="container.xl">
            <SimpleGrid columns={4} spacing={10}>
                {results.map((result) => {
                    return <Box
                        padding={4}
                        key={result.name}
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
                            {result.name}
                        </Box>
                        <Box>
                            <Box as='span' fontSize='6rem'>
                                {result.successProblems.length}
                            </Box>
                            <Box as='span' color='gray.600' fontSize='4rem'>
                                / {result.successProblems.length + result.failedProblems.length}
                            </Box>
                            {
                                result.failedProblems.map((problem) => {
                                    return <Box key={problem} as='div' color='red.500' fontSize='1rem'>
                                        {problem}
                                    </Box>
                                })
                            }
                            {
                                result.successProblems.map((problem) => {
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
    let results: Array<Result> = [];
    for (const member of targets) {
        const res = await fetch(`https://codeforces.com/api/user.status?handle=${member}&from=1&count=50`)
            .then(res => res.json())
        const passProblems = new Set()
        const problems = new Set()

        for (const sub of res["result"]) {
            const timeSecs = sub["creationTimeSeconds"]
            const date = new Date(timeSecs * 1000)
            if (!(date.getDate() === new Date().getDate())) {
                continue
            }
            const problem = sub["problem"]
            const id = problem["contestId"] + problem["index"] + " " + problem["name"]
            if (sub["verdict"] === "OK") {
                passProblems.add(id)
            } else {
                problems.add(id)
            }
        }

        const failedProblems = Array.from(problems).filter(x => !passProblems.has(x))
        results.push({
            name: member,
            successProblems: Array.from(passProblems) as string[],
            failedProblems: failedProblems as string[],
        });
    }

    return {
        props: {
            results
        },
    }
}
