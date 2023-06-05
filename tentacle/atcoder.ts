import { Problem, Tentacle, UserProblemStatus } from "../types/tentacle";
import { CRAWL_DAY, LogFunc } from "../utils/utils";

export class AtcoderTentacle implements Tentacle
{
    async fetch(account: string, _logger: LogFunc): Promise<UserProblemStatus>
    {
        const all_problems = await fetch("https://kenkoooo.com/atcoder/resources/contest-problem.json").then(resp => resp.json());
        const pid2cid : Record<string,string> = {};
        for(const problem of all_problems) pid2cid[problem["problem_id"]] = problem["contest_id"];
        const from_second = new Date();
        from_second.setDate(from_second.getDate()-CRAWL_DAY);
        const data = await fetch(
            `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${account}&from_second=${Math.floor(from_second.getTime()/1000)}`
        ).then(resp => resp.json());
        const id2result : Record<string, boolean> = {};
        const id2problem : Record<string, Problem> = {};
        for(const item of data)
        {
            const id = item["problem_id"];
            id2result[id] ||= item["result"]==="AC";
            id2problem[id] ||= {
                id,
                platform: "atcoder",
                contest: item["contest_id"],
                title: id,
                url: `https://atcoder.jp/contests/${pid2cid[id]}/tasks/${id}`,
            };
        }
        const passProblems : Problem[] = [], failedProblems : Problem[] = [];
        for(const item of Object.entries(id2result)) (item[1] ? passProblems : failedProblems).push(id2problem[item[0]]);
        return new UserProblemStatus(passProblems, failedProblems, 0);
    }
}
