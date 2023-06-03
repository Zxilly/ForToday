import { Problem, Tentacle, UserProblemStatus } from "../types/tentacle";
import { isValidDate, LogFunc } from "../utils/utils";
import { client } from "../constants";
import { LuoguSavedToken, LuoguToken } from "../types/luogu";
import axios from "axios";
import * as dns from "dns";

export class LuoguTentacle implements Tentacle
{
    private token: LuoguSavedToken | null = null;

    async requireAuth(logger: LogFunc): Promise<boolean>
    {
        const token = await client.get("luogu_token");
        if(!token)
        {
            logger("Luogu token not found");
            return false;
        }

        const old_token = JSON.parse(token) as LuoguSavedToken;
        const { uid, client_id, timestamp } = old_token;
        if(!uid || !client_id || !timestamp || new Date().getTime() - timestamp > 1000 * 60 * 60 * 24 * 30)
        {
            logger("Luogu token invalid");
            return false;
        }

        const result = await this.check(old_token);
        if(!result)
        {
            logger("Luogu token invalid");
            return false;
        }

        this.token = old_token;

        return true;
    }

    async check(token: LuoguToken): Promise<boolean>
    {
        const resp = await luoguFetch("https://www.luogu.com.cn/record/list?user=109757&page=1&_contentOnly=1", token.uid, token.client_id);

        return resp.currentTemplate === "RecordList";
    }

    async fetch(account: string, logger: LogFunc): Promise<UserProblemStatus>
    {
        if(!this.token)
        {
            throw new Error("Luogu token not found");
        }

        if(!await this.check(this.token))
        {
            console.warn("Luogu token invalid");
            return UserProblemStatus.empty();
        }

        const { uid, client_id } = this.token;

        const successProblemIDs: Set<string> = new Set();
        const failedProblemIDs: Set<string> = new Set();
        const problems = new Array<Problem>();

        for(let i = 1; i <= 2; i++)
        {
            const resp = await luoguFetch(`https://www.luogu.com.cn/record/list?user=${account}&page=${i}&_contentOnly=1`, uid, client_id);
            logger(`Fetched luogu ${account} page ${i}.`);
            if(resp.currentTemplate !== "RecordList")
            {
                throw new Error("Luogu token invalid");
            }

            for(const record of resp.currentData.records.result)
            {
                const time = record.submitTime;
                if(!isValidDate(new Date(time * 1000)))
                {
                    continue;
                }

                const id = `luogu-${record.problem.pid}`;
                if(record.status === 12)
                {
                    successProblemIDs.add(id);
                }

                problems.push({
                    url: `https://www.luogu.com.cn/problem/${record.problem.pid}`,
                    id: id,
                    title: record.problem.title,
                    contest: record.contest?.name ?? "",
                    platform: "luogu"
                });
            }

            for(const problem of problems)
            {
                if(!successProblemIDs.has(problem.id))
                {
                    failedProblemIDs.add(problem.id);
                }
            }

            if(resp.currentData.records.count < 20)
            {
                break;
            }
            const oldest = new Date(resp.currentData.records.result[19].submitTime);
            if(!isValidDate(oldest))
            {
                break;
            }
        }

        const pass = Array.from(successProblemIDs).map(id => problems.find(p => p.id === id)!);
        const failed = Array.from(failedProblemIDs).map(id => problems.find(p => p.id === id)!);

        return new UserProblemStatus(pass, failed, problems.length);
    }
}

async function luoguFetch(url: string, uid: string, client_id: string): Promise<any>
{
    return await axios.get(url, {
        headers: {
            "Cookie": `_uid=${uid}; __client_id=${client_id};`,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Edg/113.0.1774.57"
        },
        lookup: async (): Promise<string> =>
        {
            const ip = await dns.promises.lookup("www.luogu.com.cn.wswebpic.com");
            return ip.address;
        }
    });
}
