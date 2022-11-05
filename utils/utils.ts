import moment from "moment";

export function isValidDate(d: Date)
{
    return moment(d).isAfter(moment().endOf("day").subtract(3, "days"));
}

export function groupBy(array: Array<any>, f: any)
{
    const groups: Record<any, any> = {};
    array.forEach(function (o)
    {
        const group = JSON.stringify(f(o));
        groups[group] = groups[group] || [];
        groups[group].push(o);
    });
    return Object.keys(groups).map(function (group)
    {
        return groups[group];
    });
}

export type LogFunc = (message: string) => void;

export function getNewTimedLogger(): LogFunc
{
    const last = Date.now();
    return function (msg: string)
    {
        const now = Date.now();
        console.log(`${msg} (${now - last}ms)`);
    };
}
