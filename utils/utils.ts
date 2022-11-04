import moment from "moment";

export function isValidDate(d: Date) {
    return moment(d).isAfter(moment().endOf("day").subtract(3, "days"));
}

export function groupBy(array: Array<any>, f: any) {
    let groups: Record<any, any> = {};
    array.forEach(function (o) {
        let group = JSON.stringify(f(o));
        groups[group] = groups[group] || [];
        groups[group].push(o);
    });
    return Object.keys(groups).map(function (group) {
        return groups[group];
    });
}

export type LogFunc = (message: string) => void;

export function getNewTimedLogger(): LogFunc {
    let last = Date.now();
    return function (msg: string) {
        const now = Date.now();
        console.log(`${msg} (${now - last}ms)`);
    }
}
