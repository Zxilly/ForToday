import moment from "moment";

export function isValidDate(d: Date) {
   return moment(d).isAfter(moment().endOf("day").subtract(3, "days"));
}
