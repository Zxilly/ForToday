import moment from "moment-timezone";
import Redis from "ioredis";

export const CRAWL_DAY = 7;

export function isValidDate(d: Date)
{
    const current = moment(d);
    const before = moment().tz("Asia/Shanghai").endOf("day").subtract(CRAWL_DAY, "days");
    return current.isAfter(before);
}

export function groupBy<T>(array: Array<T>, f: (arg: T) => unknown)
{
    const groups: Record<string, Array<T>> = {};
    array.forEach(function(o)
    {
        const group = JSON.stringify(f(o));
        groups[group] = groups[group] || [];
        groups[group].push(o);
    });
    return Object.keys(groups)
        .sort((a, b) => a.localeCompare(b))
        .map((group) => groups[group]);
}

export type LogFunc = (message: string) => string | void;

export function getNewTimedLogger(): LogFunc
{
    const last = Date.now();
    const messages = new Array<string>();
    return function(msg: string)
    {
        if(msg === "getResult")
        {
            return messages.join("\n");
        }

        const now = Date.now();
        const msgt = `[${now - last}ms] ${msg}`;
        console.log(msgt);
        messages.push(msgt);
    };
}

export async function readData(client: Redis, log?: LogFunc): Promise<string | null>
{
    log?.("Reading data...");
    const data = await client.get("data");
    log?.("Read data.");
    return data;
}

export function rankParse(rank: number)
{
    if(rank <= 0)
    {
        return -1;
    }
    else if(rank < 1200)
    {
        return 0;
    }
    else if(rank < 1400)
    {
        return 1;
    }
    else if(rank < 1600)
    {
        return 2;
    }
    else if(rank < 1900)
    {
        return 3;
    }
    else if(rank < 2100)
    {
        return 4;
    }
    else if(rank < 2300)
    {
        return 5;
    }
    else if(rank < 2400)
    {
        return 6;
    }
    else if(rank < 2600)
    {
        return 7;
    }
    else if(rank < 3000)
    {
        return 8;
    }
    else
    {
        return 9;
    }
}

export function rankColor(rank: number)
{
    switch (rank)
    {
        case -1:
            return "black";
        case 0:
            return "gray";
        case 1:
            return "green";
        case 2:
            return "#03a89e";
        case 3:
            return "blue";
        case 4:
            return "#aa00aa";
        case 5:
            return "orange";
        case 6:
            return "orange";
        default:
            return "red";
    }
}
