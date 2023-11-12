import { load } from "cheerio";
import { Tentacle, UserProblemStatus } from "../types/tentacle";
import { LogFunc, isValidDate } from "../utils/utils";
import { ProblemHelper } from "./helper";

export class NowCoderTentacle implements Tentacle
{
    async fetch(account: string, _logger: LogFunc): Promise<UserProblemStatus>
    {
        const res = await fetch(
            `https://ac.nowcoder.com/acm/contest/profile/${account}/practice-coding?pageSize=200`
        ).then(res => res.text());
        const dom = load(res);
        const table = dom("table.table-hover");
        const tbody = table?.find("tbody");
        const rows = tbody?.find("tr");
        if(rows === undefined || rows.length === 1)
            return UserProblemStatus.empty();
        const helper = new ProblemHelper();
        rows.each((i, row) =>
        {
            const items = dom(row).find("td");
            const date = new Date(dom(items.eq(8)).text() ?? "");
            if(!isValidDate(date)) return;
            const info = dom(items.eq(1)).find("a");
            const url = info.attr("href");
            const id = url?.substring(url.lastIndexOf("/") + 1) ?? "Unknown";
            helper.add_problem(id, items.eq(3).text().trim() === "100", {
                id,
                platform: "nowcoder",
                contest: "",
                title: info.text() ?? "",
                url: `https://ac.nowcoder.com${url}`,
            });
        });
        return helper.get_status();
    }
}
