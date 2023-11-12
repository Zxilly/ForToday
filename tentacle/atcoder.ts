import { Tentacle, UserProblemStatus } from "../types/tentacle";
import { CRAWL_DAY, LogFunc } from "../utils/utils";
import { ProblemHelper } from "./helper";

export class AtcoderTentacle implements Tentacle
{
    async fetch(account: string, _logger: LogFunc): Promise<UserProblemStatus>
    {
        const contests_info = await fetch("https://kenkoooo.com/atcoder/resources/contests.json").then(resp => resp.json());
        const cid2title : Record<string, string> = {};
        for(const info of contests_info) cid2title[info["id"]] = info["title"];

        const problems_info = await fetch("https://kenkoooo.com/atcoder/resources/problems.json").then(resp => resp.json());
        const pid2pro : Record<string, { contest_id:string, title:string }> = {};
        for(const info of problems_info)
        {
            pid2pro[info["id"]] = {
                contest_id: info["contest_id"],
                title: info["title"]
            };
        }

        const from_second = Math.floor(Date.now()/1000)-CRAWL_DAY*24*60*60;
        const data = await fetch(
            `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${account}&from_second=${from_second}`
        ).then(resp => resp.json());

        const helper = new ProblemHelper();
        for(const item of data)
        {
            const id = item["problem_id"];
            const p = pid2pro[id];
            helper.add_problem(id, item["result"]==="AC", {
                id,
                platform: "atcoder",
                contest: cid2title[p.contest_id],
                title: p.title,
                url: `https://atcoder.jp/contests/${p.contest_id}/tasks/${id}`,
            });
        }
        return helper.get_status();
    }
}
