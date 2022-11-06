import moment from "moment";

export function isValidDate(d: Date)
{
    return moment(d).isAfter(moment().endOf("day").subtract(3, "days"));
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
    return Object.keys(groups).map((group) => groups[group]);
}

export type LogFunc = (message: string) => void;

export function getNewTimedLogger(): LogFunc
{
    const last = Date.now();
    return function(msg: string)
    {
        const now = Date.now();
        console.log(`${msg} (${now - last}ms)`);
    };
}

export function rankParse(rank: number)
{
    if(rank < 1200)
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
