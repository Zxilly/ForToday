import { Problem, Tentacle, TentacleID, UserProblemStatus } from "../types/tentacle";
import { load } from "cheerio";
import { CODEFORCES_GROUP_ID } from "../constants";
import { isValidDate, LogFunc, rankParse } from "../utils/utils";

export class CodeforcesTentacle implements Tentacle
{
    async fetch(account: string, _logger: LogFunc): Promise<UserProblemStatus>
    {
        const passProblemIds = new Set<string>();
        const problems = new Array<Problem>();

        const rankResp = await fetch(`https://codeforces.com/profile/${account}`).then(res => res.text());
        const rankDom = load(rankResp);
        const rank = rankDom(".info").find("li").eq(0).find("span").eq(0).text();
        const rankNum = parseInt(rank, 10);
        const rankResult = rankParse(rankNum);

        const resp = await fetch(`https://codeforces.com/submissions/${account}`).then(res => res.text());
        const dom = load(resp);

        // const table = dom.querySelector("table.status-frame-datatable");
        const table = dom("table.status-frame-datatable");
        if(table === null) return new UserProblemStatus([], [], 0);
        const rows = table.find("tr:not(.first-row)");
        rows.each((_, row) =>
        {
            const cells = dom(row).find("td");
            const time = dom(cells).find("span.format-time");
            if(!time.length) return;
            const timeStr = time.text()?.trim();
            if(!timeStr.length) return;
            const date = new Date(timeStr);
            if(!isValidDate(date)) return;
            const problemName = dom(cells[3]).text()?.trim();
            if(!problemName.length) return;
            const url = dom(cells[3]).find("a").attr("href");
            if(!url) return;
            const problemRE = new RegExp("\\/contest\\/(?<contest>\\d*)\\/problem/.*");
            const match = url.match(problemRE);
            if(!match) return;
            const contest = match.groups?.contest;
            if(!contest) return;
            const name = `${problemName}`;

            // const status = row.querySelector("span.verdict-accepted");
            const status = dom(row).find("span.verdict-accepted");

            const id = `${contest}${name}`;
            const problem = {
                platform: "codeforces" as TentacleID,
                id: id,
                title: name,
                contest: contest,
                url: `https://codeforces.com${url}` ?? ""
            };

            if(status.length !== 0) passProblemIds.add(id);
            problems.push(problem);
        });

        const failedProblemIds = new Set<string>();
        for(const problem of problems)
        {
            if(!passProblemIds.has(problem.id))
            {
                failedProblemIds.add(problem.id);
            }
        }

        const successProblems = Array.from(passProblemIds).map(id => problems.find(problem => problem.id === id)!);
        const failedProblems = Array.from(failedProblemIds).map(id => problems.find(problem => problem.id === id)!);

        return new UserProblemStatus(
            successProblems,
            failedProblems,
            problems.length,
            rankResult
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
        const dom = load(res);


        const trs = dom("tr[data-contestId]");
        const contestIds: string[] = [];
        trs.each((_, tr) =>
        {
            const contestId = dom(tr).attr("data-contestid");
            if(contestId) contestIds.push(contestId);
        });
        const contestNames = trs.map((_, tr) =>
        {
            return dom(tr)
                .children("td")
                .eq(0)
                .text()
                .split("\n")
                .map(s => s.trim())
                .filter(s => s.length > 0)[0];
        });

        const tasks = new Array<Promise<void>>();
        for(let j = 0; j < contestIds.length; j++)
        {
            const task = async () =>
            {
                const url = `https://codeforces.com/group/${CODEFORCES_GROUP_ID}/contest/${contestIds[j]}/status`;

                const singlePageTasks: Promise<void>[] = [];

                for(let i = 1; i <= 3; i++)
                {
                    const singlePageTask = async () =>
                    {
                        const response = await fetch(`${url}/page/${i}`).then((res) => res.text());
                        logger(`Fetched Codeforces contest ${contestNames[j]} submissions page ${i}.`);
                        const $ = load(response);
                        // logger(`Parsed Codeforces contest ${contestNames[j]} submissions page ${i}.`);

                        const pageIndex = $("span.page-index.active");
                        if(!pageIndex.length)
                        {
                            if(i !== 1) return;
                        }
                        const index = pageIndex.eq(0).attr("pageindex");
                        if(!index || index === "") return;
                        if(parseInt(index) !== i)
                        {
                            logger(`Codeforces contest ${contestNames[j]} submissions page ${i} is not valid.`);
                            return;
                        }

                        const table = $("table.status-frame-datatable");
                        if(table === null) return;
                        const rows = table.find("tr:not(.first-row)");
                        rows.each((_, row) =>
                        {
                            const cells = $(row).find("td");
                            const time = $(cells).find("span.format-time");
                            if(!time.length) return;
                            const timeStr = time.text()?.trim();
                            if(!timeStr) return;
                            const date = new Date(timeStr);
                            if(!isValidDate(date)) return;

                            const submitUser = $(cells.children().eq(2)).text()?.trim().replaceAll("\n", "").trim();
                            if(!submitUser) return;
                            if(!accounts.includes(submitUser)) return;

                            const problemID = $(cells.children().eq(3)).text()?.trim();
                            if(!problemID) return;
                            const contestName = contestNames[j];
                            const name = `${problemID}`;

                            const url = cells.children().eq(3).eq(0).attr("href");
                            if(!url) return;

                            const status = $(row).find("span.verdict-accepted");
                            const problem = {
                                platform: "codeforces" as TentacleID,
                                url: `https://codeforces.com${url}` ?? "",
                                title: name,
                                contest: contestName,
                                id: url
                            };
                            if(status.length !== 0) submitSuccessIdsMap.get(submitUser)!.add(problem.id);
                            submitMap.get(submitUser)!.push(problem);
                        });
                    };
                    singlePageTasks.push(singlePageTask());
                }
                await Promise.all(singlePageTasks);
                for(const [user, problems] of Array.from(submitMap))
                {
                    const userSuccessIds = submitSuccessIdsMap.get(user)!;
                    const userFailedIds = submitFailedIdsMap.get(user)!;
                    for(const problem of problems)
                    {
                        if(!userSuccessIds.has(problem.id))
                        {
                            if(!userFailedIds.has(problem.id))
                            {
                                userFailedIds.add(problem.id);
                            }
                        }
                    }
                }
            };
            tasks.push(task());
        }
        await Promise.all(tasks);

        const result = new Map<string, UserProblemStatus>();
        for(const [user, problems] of Array.from(submitMap))
        {

            const successProblems = Array.from(submitSuccessIdsMap.get(user)!).map(id => problems.find(problem => problem.id === id)!);
            const failedProblems = Array.from(submitFailedIdsMap.get(user)!).map(id => problems.find(problem => problem.id === id)!);
            result.set(user, new UserProblemStatus(successProblems, failedProblems, problems.length));
        }
        return result;
    }
}
