// noinspection JSIgnoredPromiseFromCall

import {Box, Container, SimpleGrid} from '@chakra-ui/react'
import {targets, trainings} from "../constants";
import {JSDOM} from "jsdom";

interface Result {
    name: string,
    successProblems: string[],
    failedProblems: string[],
}


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
    const submitSuccess = new Map<string, Set<string>>();
    const submitMap = new Map<string, Set<string>>();
    const submitFailedMap = new Map<string, Set<string>>();

    for (const target of targets) {
        submitSuccess.set(target, new Set<string>());
        submitMap.set(target, new Set<string>());
        submitFailedMap.set(target, new Set<string>());
    }
    for (const trainID of trainings) {
        const url = `https://codeforces.com/group/MlnUj8Knxs/contest/${trainID}/status`
        const response = await fetch(url).then((res) => res.text())

        const doc  = new JSDOM(response).window.document
        const table = doc.querySelector('table.status-frame-datatable')
        if (table == null) {
            continue
        }
        // not have class first-row
        const rows = table.querySelectorAll('tr:not(.first-row)')
        for (const row of Array.from(rows)) {
            const cells = row.querySelectorAll('td')
            const time = row.querySelector('span.format-time')
            if (!time) {
                continue
            }
            const timeStr = time.textContent
            if (!timeStr) {
                continue
            }
            const date = new Date(timeStr)
            if (date.getDate() != new Date().getDate()) {
                continue
            }

            const submitUser = cells[2].textContent?.trim().replaceAll('\n', '')
            if (!submitUser) {
                continue
            }
            if (!targets.includes(submitUser)) {
                continue
            }

            const problemID = cells[3].textContent
            if (!problemID) {
                continue
            }
            const status = row.querySelector('span.verdict-accepted')
            if (status) {
                submitSuccess.get(submitUser)?.add(problemID)
            } else {
                submitMap.get(submitUser)?.add(problemID)
            }
        }

        for (const [user, problems] of Array.from(submitMap)) {
            for (const problem of Array.from(problems)) {
                if (!submitSuccess.get(user)?.has(problem)) {
                    submitFailedMap.get(user)?.add(problem)
                }
            }
        }
    }


    let results: Array<Result> = [];
    for (const member of targets) {
        const res = await fetch(`https://codeforces.com/api/user.status?handle=${member}&from=1&count=50`)
            .then(res => res.json())
        const passProblems = new Set<string>()
        const problems = new Set<string>()

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

        passProblems.forEach(x => submitSuccess.get(member)?.add(x))
        failedProblems.forEach(x => submitFailedMap.get(member)?.add(x))

        results.push({
            name: member,
            successProblems: Array.from(submitSuccess.get(member) ?? []),
            failedProblems: Array.from(submitFailedMap.get(member) ?? []),
        })
    }

    return {
        props: {
            results
        },
    }
}
