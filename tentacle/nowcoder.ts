import { Problem, Tentacle, UserProblemStatus } from "../types/tentacle";
import { isValidDate, LogFunc } from "../utils/utils";
import { JSDOM } from "jsdom";

export class NowcoderTentacle implements Tentacle
{
    async fetch(account: string, _logger: LogFunc): Promise<UserProblemStatus>
    {
        const res = await fetch(
            `https://ac.nowcoder.com/acm/contest/profile/${account}/practice-coding?pageSize=200`
        );
        const dom = new JSDOM(await res.text()).window.document;
        const table = dom.querySelector("table.table-hover");
        const tbody = table?.querySelector("tbody");
        const rows = tbody?.querySelectorAll("tr");
        if(rows === undefined || rows.length === 1)
            return new UserProblemStatus([], [], 0);
        const passProblems: Problem[] = [];
        const passProblemsID = new Set<string>();
        const failedProblems: Problem[] = [];
        const failedProblemsID = new Set<string>();
        let cnt = 0;
        for(const row of Array.from(rows))
        {
            const items = row.querySelectorAll("td");
            const date = new Date(items.item(8).textContent ?? "");
            if(!isValidDate(date)) break;
            cnt++;
            const info = items.item(1).querySelector("a");
            const url = info?.getAttribute("href");
            const problem: Problem = {
                id: url?.substring(url.lastIndexOf("/") + 1) ?? "Unknown",
                platform: "nowcoder",
                contest: "",
                title: info?.textContent ?? "",
                url: `https://ac.nowcoder.com${url}`,
            };
            if(items.item(3).textContent === "100")
            {
                if(!passProblemsID.has(problem.id))
                {
                    passProblems.push(problem);
                    passProblemsID.add(problem.id);
                }
            }
            else
            {
                if(!failedProblemsID.has(problem.id))
                {
                    failedProblems.push(problem);
                    failedProblemsID.add(problem.id);
                }
            }
        }
        return new UserProblemStatus(passProblems, failedProblems, cnt);
    }
}
