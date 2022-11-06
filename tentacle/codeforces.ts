import { Problem, Tentacle, TentacleID, UserProblemStatus } from "../types/tentacle";
import { JSDOM } from "jsdom";
import { CODEFORCES_GROUP_ID } from "../constants";
import { isValidDate, LogFunc } from "../utils/utils";

export class CodeforcesTentacle implements Tentacle
{
    async fetch(account: string, _logger: LogFunc): Promise<UserProblemStatus>
    {
        const passProblemIds = new Set<string>();
        const problems = new Array<Problem>();

        const resp = await fetch(`https://codeforces.com/submissions/${account}`).then(res => res.text());
        const dom = new JSDOM(resp).window.document;

        const table = dom.querySelector("table.status-frame-datatable");
        if(table === null) return new UserProblemStatus([], [], 0);
        const rows = table.querySelectorAll("tr:not(.first-row)");
        for(const row of Array.from(rows))
        {
            const cells = row.querySelectorAll("td");
            const time = row.querySelector("span.format-time");
            if(!time) continue;
            const timeStr = time.textContent?.trim();
            if(!timeStr) continue;
            const date = new Date(timeStr);
            if(!isValidDate(date)) continue;
            const problemName = cells[3].textContent?.trim();
            if(!problemName) continue;
            const url = cells[3]?.querySelector("a")?.href;
            if(!url) continue;
            const problemRE = new RegExp("\\/contest\\/(?<contest>\\d*)\\/problem/.*");
            const match = url.match(problemRE);
            if(!match) continue;
            const contest = match.groups?.contest;
            if(!contest) continue;
            const name = `${problemName}`;

            const status = row.querySelector("span.verdict-accepted");

            const id = `${contest}${name}`;
            const problem = {
                platform: "codeforces" as TentacleID,
                id: id,
                title: name,
                contest: contest,
                url: `https://codeforces.com${url}` ?? ""
            };

            if(status) passProblemIds.add(id);
            problems.push(problem);
        }

        const failedProblemIds = new Set<string>();
        for(const problem of problems)
        {
            if(!passProblemIds.has(problem.id))
            {
                failedProblemIds.add(problem.id);
            }
        }

        const successProblems = problems.filter(problem => passProblemIds.has(problem.id));
        const failedProblems = problems.filter(problem => failedProblemIds.has(problem.id));

        return new UserProblemStatus(
            successProblems,
            failedProblems,
            problems.length
        );
    }

    async batchFetch(accounts: string[], logger: LogFunc): Promise<Map<string, UserProblemStatus>>
    {
        const submitSuccessIdsMap = new Map<string, Set<string>>();
        const submitMap = new Map<string, Array<Problem>>();
        const submitFailedIdsMap = new Map<string, Set<string>>();

        for(const target of accounts)
        {
            submitSuccessIdsMap.set(target, new Set<string>());
            submitMap.set(target, new Array<Problem>());
            submitFailedIdsMap.set(target, new Set<string>());
        }

        // logger("Fetching Codeforces group submissions...")
        const res = await fetch(`https://codeforces.com/group/${CODEFORCES_GROUP_ID}/contests`).then(res => res.text());
        logger("Fetched Codeforces group submissions");
        const dom = new JSDOM(res).window.document;

        const trs = Array.from(dom.querySelectorAll("tr[data-contestId]"));
        const contestIds = trs.map(tr => tr.getAttribute("data-contestId"));
        const contestNames = trs.map(tr => tr
            .querySelectorAll("td")[0]
            ?.textContent
            ?.split("\n")
            ?.filter(value =>
            {
                // not all blank
                return value && value.trim();
            })[0].trim() ?? "");

        const tasks = new Array<Promise<void>>();
        for(let j = 0; j < contestIds.length; j++)
        {
            const task = async () =>
            {
                const url = `https://codeforces.com/group/${CODEFORCES_GROUP_ID}/contest/${contestIds[j]}/status`;

                const tasks: Promise<void>[] = [];
                for(let i = 1; i <= 3; i++)
                {
                    const task = async () =>
                    {
                        // logger(`Fetching Codeforces contest ${contestNames[j]} submissions page ${i}...`)
                        const response = await fetch(`${url}/page/${i}`).then((res) => res.text());
                        logger(`Fetched Codeforces contest ${contestNames[j]} submissions page ${i}.`);
                        const doc = new JSDOM(response).window.document;

                        const pageIndex = doc.querySelector("span.page-index.active");
                        if(!pageIndex) return;
                        const index = pageIndex.getAttribute("pageIndex");
                        if(!index) return;
                        if(parseInt(index) !== i)
                        {
                            logger(`Codeforces contest ${contestNames[j]} submissions page ${i} is not valid.`);
                            return;
                        }

                        const table = doc.querySelector("table.status-frame-datatable");
                        if(table === null) return;
                        const rows = table.querySelectorAll("tr:not(.first-row)");
                        for(const row of Array.from(rows))
                        {
                            const cells = row.querySelectorAll("td");
                            const time = row.querySelector("span.format-time");
                            if(!time) continue;
                            const timeStr = time.textContent?.trim();
                            if(!timeStr) continue;
                            const date = new Date(timeStr);
                            if(!isValidDate(date)) continue;

                            const submitUser = cells[2].textContent?.trim().replaceAll("\n", "");
                            if(!submitUser) continue;
                            if(!accounts.includes(submitUser)) continue;

                            const problemID = cells[3].textContent?.trim().replaceAll("\n", "");
                            if(!problemID) continue;
                            const contestName = contestNames[j];
                            const name = `${problemID}`;
                            const id = `${contestName}${name}`;

                            const url = cells[3]?.querySelector("a")?.href;
                            if(!url) continue;

                            const status = row.querySelector("span.verdict-accepted");
                            const problem = {
                                platform: "codeforces" as TentacleID,
                                url: `https://codeforces.com${url}` ?? "",
                                title: name,
                                contest: contestName,
                                id: id
                            };
                            if(status) submitSuccessIdsMap.get(submitUser)?.add(problem.id);
                            submitMap.get(submitUser)?.push(problem);
                        }
                    };
                    tasks.push(task());
                }
                await Promise.all(tasks);
                for(const [user, problems] of Array.from(submitMap))
                    for(const problem of Array.from(problems))
                        if(!submitSuccessIdsMap.get(user)?.has(problem.id))
                            submitFailedIdsMap.get(user)?.add(problem.id);
            };
            tasks.push(task());
        }
        await Promise.all(tasks);

        const result = new Map<string, UserProblemStatus>();
        for(const [user, problems] of Array.from(submitMap))
        {
            const successProblems = problems.filter(problem => submitSuccessIdsMap.get(user)?.has(problem.id));
            const failedProblems = problems.filter(problem => submitFailedIdsMap.get(user)?.has(problem.id));
            result.set(user, new UserProblemStatus(successProblems, failedProblems, problems.length));
        }
        return result;
    }
}
