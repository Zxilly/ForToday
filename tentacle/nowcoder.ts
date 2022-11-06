import { Problem, Tentacle, UserProblemStatus } from "../types/tentacle";
import { isValidDate, LogFunc } from "../utils/utils";
import { load } from "cheerio";

export class NowcoderTentacle implements Tentacle
{
    async fetch(account: string, _logger: LogFunc): Promise<UserProblemStatus>
    {
        const res = await fetch(
            `https://ac.nowcoder.com/acm/contest/profile/${account}/practice-coding?pageSize=200`
        ).then(res => res.text());
        const dom = load(res);
        const table = dom("table.table-hover");
        const tbody = table?.find("tbody");
        const rows = tbody?.find("tr");
        if(rows === undefined || rows.length === 1)
            return new UserProblemStatus([], [], 0);
        const passProblems: Problem[] = [];
        const passProblemsID = new Set<string>();
        const failedProblems: Problem[] = [];
        const failedProblemsID = new Set<string>();
        let cnt = 0;
        for(const row of Array.from(rows))
        {
            const items = dom(row).find("td");
            const date = new Date(dom(items.eq(8)).text() ?? "");
            if(!isValidDate(date)) break;
            cnt++;
            const info = items.eq(1);
            const url = info.attr("href");
            const problem: Problem = {
                id: url?.substring(url.lastIndexOf("/") + 1) ?? "Unknown",
                platform: "nowcoder",
                contest: "",
                title: info.text() ?? "",
                url: `https://ac.nowcoder.com${url}`,
            };
            if(items.eq(3).text().trim() === "100")
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
