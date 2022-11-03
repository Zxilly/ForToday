import {ProblemStatus, Tentacle} from "../types/tentacle";
import {JSDOM} from "jsdom";
import {CODEFORCES_GROUP_ID} from "../constants";
import {isValidDate} from "../utils/utils";

export class CodeforcesTentacle implements Tentacle {
    async fetch(account: string): Promise<ProblemStatus> {

        const passProblems = new Set<string>()
        const problems = new Set<string>()

        const resp = await fetch(`https://codeforces.com/submissions/${account}`).then(res => res.text())
        const dom = new JSDOM(resp).window.document

        const table = dom.querySelector('table.status-frame-datatable')
        if (table == null) {
            return {
                pass: [],
                failed: [],
                submitted: 0
            }
        }
        const rows = table.querySelectorAll('tr:not(.first-row)')
        for (const row of Array.from(rows)) {
            const cells = row.querySelectorAll('td')
            const time = row.querySelector('span.format-time')
            if (!time) {
                continue
            }
            const timeStr = time.textContent?.trim()
            if (!timeStr) {
                continue
            }
            const date = new Date(timeStr)
            if (!isValidDate(date)) {
                continue
            }
            const problemID = cells[3].textContent?.trim()
            if (!problemID) {
                continue
            }
            const status = row.querySelector('span.verdict-accepted')
            if (status) {
                passProblems.add(problemID)
            }
            problems.add(problemID)
        }

        const failedProblems = Array.from(problems).filter(x => !passProblems.has(x))

        return {
            pass: Array.from(passProblems).map(x => `CF: ${x}`),
            failed: failedProblems.map(x => `CF: ${x}`),
            submitted: problems.size
        }
    }

    async batchFetch(accounts: string[]): Promise<Map<string, ProblemStatus>> {
        const submitSuccess = new Map<string, Set<string>>();
        const submitMap = new Map<string, Array<string>>();
        const submitFailedMap = new Map<string, Set<string>>();

        for (const target of accounts) {
            submitSuccess.set(target, new Set<string>());
            submitMap.set(target, new Array<string>());
            submitFailedMap.set(target, new Set<string>());
        }

        const res = await fetch(`https://codeforces.com/group/${CODEFORCES_GROUP_ID}/contests`).then(res => res.text())
        const dom = new JSDOM(res).window.document

        const trs = Array.from(dom.querySelectorAll("tr[data-contestId]"))
        const contestIds = trs.map(tr => tr.getAttribute("data-contestId"))

        for (const contestId of contestIds) {
            const url = `https://codeforces.com/group/${CODEFORCES_GROUP_ID}/contest/${contestId}/status`
            let response = await fetch(url).then((res) => res.text())
            let doc = new JSDOM(response).window.document

            const indexCount = doc.querySelectorAll("span[pageIndex]").length

            const tasks: Promise<void>[] = []
            for (let i = 1; i <= indexCount; i++) {
                const task = async () => {
                    if (i !== 1) {
                        response = await fetch(`${url}/page/${i}`).then((res) => res.text())
                        doc = new JSDOM(response).window.document
                    }

                    const table = doc.querySelector('table.status-frame-datatable')
                    if (table == null) {
                        return
                    }
                    const rows = table.querySelectorAll('tr:not(.first-row)')
                    for (const row of Array.from(rows)) {
                        const cells = row.querySelectorAll('td')
                        const time = row.querySelector('span.format-time')
                        if (!time) {
                            continue
                        }
                        const timeStr = time.textContent?.trim()
                        if (!timeStr) {
                            continue
                        }
                        const date = new Date(timeStr)
                        if (!isValidDate(date)) {
                            continue
                        }

                        const submitUser = cells[2].textContent?.trim().replaceAll('\n', '')
                        if (!submitUser) {
                            continue
                        }
                        if (!accounts.includes(submitUser)) {
                            continue
                        }

                        const problemID = cells[3].textContent?.trim().replaceAll('\n', '')
                        if (!problemID) {
                            continue
                        }
                        const status = row.querySelector('span.verdict-accepted')
                        if (status) {
                            submitSuccess.get(submitUser)?.add(problemID)
                        }
                        submitMap.get(submitUser)?.push(problemID)
                    }
                }
                tasks.push(task())
            }
            await Promise.all(tasks)
            for (const [user, problems] of Array.from(submitMap)) {
                for (const problem of Array.from(problems)) {
                    if (!submitSuccess.get(user)?.has(problem)) {
                        submitFailedMap.get(user)?.add(problem)
                    }
                }
            }
        }

        const result = new Map<string, ProblemStatus>()
        for (const [user, problems] of Array.from(submitSuccess)) {
            result.set(user, {
                pass: (Array.from(problems) ?? []).map(x => `CF: ${x}`),
                failed: Array.from(submitFailedMap.get(user) ?? []).map(x => `CF: ${x}`),
                submitted: Array.from(submitMap.get(user) ?? []).length
            })
        }
        return result
    }
}
