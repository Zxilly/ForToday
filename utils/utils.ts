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
