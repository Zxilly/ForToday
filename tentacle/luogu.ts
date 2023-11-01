import axios, { AxiosError, AxiosInstance, AxiosResponse, LookupAddress } from "axios";
import * as dns from "dns";
import * as http from "http";
import * as https from "https";
import { ProblemHelper } from ".";
import { client } from "../constants";
import { LuoguSavedToken, LuoguToken } from "../types/luogu";
import { Tentacle, UserProblemStatus } from "../types/tentacle";
import { isValidDate, LogFunc } from "../utils/utils";
import axiosRetry from "axios-retry";

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
        const resp = (await luoguFetch("https://www.luogu.com.cn/record/list?user=109757&page=1&_contentOnly=1", token.uid, token.client_id)).data;

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

        const helper = new ProblemHelper();
        let latestTime = 0;
        for(let i = 1; ; i++)
        {
            const resp = (await luoguFetch(`https://www.luogu.com.cn/record/list?user=${account}&page=${i}&_contentOnly=1`, uid, client_id)).data;
            logger(`Fetched luogu ${account} page ${i}.`);
            if(resp.currentTemplate !== "RecordList")
            {
                throw new Error("Luogu token invalid");
            }

            for(const record of resp.currentData.records.result)
            {
                const time = record.submitTime;
                if(latestTime < time) {
                    latestTime = time;
                }
                if(!isValidDate(new Date(time * 1000)))
                {
                    continue;
                }

                const id = `luogu-${record.problem.pid}`;
                helper.add_problem(id, record.status === 12, {
                    id,
                    platform: "luogu",
                    contest: record.contest?.name ?? "",
                    title: `${record.problem.pid} ${record.problem.title}`,
                    url: `https://www.luogu.com.cn/problem/${record.problem.pid}`
                });
            }

            if(resp.currentData.records.count < 20)
            {
                break;
            }
            if(!isValidDate(new Date(latestTime)))
            {
                break;
            }
        }
        return helper.get_status();
    }
}

const customDNSLookup = (hostname: string, options: dns.LookupOptions, callback: (err: NodeJS.ErrnoException | null, address: any, family: number) => void): void =>
{
    return dns.lookup("www.luogu.com.cn.wswebpic.com", options, (err, address, family) =>
    {
        callback(err, address, family);
    });
};


const httpAgent = new http.Agent({ lookup: customDNSLookup });
const httpsAgent = new https.Agent({ lookup: customDNSLookup });


const customAxios: AxiosInstance = axios.create({
    httpAgent,
    httpsAgent
});

axiosRetry(customAxios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

async function luoguFetch(url: string, uid: string, client_id: string): Promise<AxiosResponse<any, any>>
{
    try
    {
        return await customAxios.get(url, {
            headers: {
                "Cookie": `_uid=${uid}; __client_id=${client_id};`,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36 Edg/113.0.1774.57"
            }
        });
    } catch(error)
    {
        const e = error as AxiosError;
        console.error(e.response);
    }

    throw new Error("Luogu fetch failed");
}
