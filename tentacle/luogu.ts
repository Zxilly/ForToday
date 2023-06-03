import { Problem, Tentacle, UserProblemStatus } from "../types/tentacle";
import { isValidDate, LogFunc } from "../utils/utils";
import { client } from "../constants";
import { LuoguSavedToken, LuoguToken } from "../types/luogu";

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
        const resp = await fetch(
            "https://www.luogu.com.cn/record/list?user=109757&page=1&_contentOnly=1",
            {
                headers: {
                    "Cookie": `_uid=${token.uid}; __client_id=${token.client_id};`
                }
            }
        ).then(r =>
        {
            if(r.status !== 200)
            {
                return null;
            }
            try
            {
                return r.json();
            } catch(e)
            {
                console.error(e);
                return null;
            }
        });
        if(!resp)
        {
            return false;
        }

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
            const resp = await fetch(`https://www.luogu.com.cn/record/list?user=${account}&page=${i}&_contentOnly=1`,
                {
                    headers: {
                        "Cookie": `_uid=${uid}; __client_id=${client_id};`
                    }
                }
            ).then(r => r.json());
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
