import {
	Problem,
	Tentacle,
	TentacleID,
	UserProblemStatus,
} from "../types/tentacle";
import { load } from "cheerio";
import { CODEFORCES_GROUP_ID } from "../constant/server-consts";
import { isValidDate, LogFunc, ratingParse } from "../utils/utils";
import { slowAES, toHex, toNumbers } from "../utils/cf";
import AwaitLock from "await-lock";

export class CodeforcesTentacle implements Tentacle {
	private _token = "";
	private _lock = new AwaitLock();

	async requireAuth(logger: LogFunc): Promise<boolean> {
		const resp = await fetch("https://codeforces.com/").then((r) =>
			r.text(),
		);
		if (!resp.includes("Redirecting")) {
			return true;
		}

		logger("Start calculate cf token...");

		const testRe = /toNumbers\("(\w*)"\)/g;
		const result = [...resp.matchAll(testRe)];

		const a = toNumbers(result[0][1]);
		const b = toNumbers(result[1][1]);
		const c = toNumbers(result[2][1]);

		this._token = toHex(slowAES.decrypt(c, 2, a, b));

		logger("Calculated cf token.");

		return true;
	}

	async fetch(account: string, logger: LogFunc): Promise<UserProblemStatus> {
		const passProblemIds = new Set<string>();
		const problems = new Array<Problem>();

		const ratingResp = await this.fakeFetch(
			`https://codeforces.com/profile/${account}`,
		).then((res) => res.text());
		const ratingDom = load(ratingResp);
		const ratingStr = ratingDom(".info")
			.find("li")
			.eq(0)
			.find("span")
			.eq(0)
			.text();
		const rating = parseInt(ratingStr, 10);
		const level = ratingParse(rating);

		await this._lock.acquireAsync();
		const subUrl = `https://codeforces.com/submissions/${account}`;
		const resp = await this.fakeFetch(subUrl).then((res) => res.text());
		let dom = load(resp);

		const unofficial = dom("#showUnofficial");
		// check unofficial has "checked" attribute
		if (unofficial.attr("checked") === undefined) {
			logger("Unofficial is not checked");
			// get parent form
			const form = unofficial.parent("form");
			// get token
			const token = form.find("input[name=csrf_token]").attr("value");
			if (!token) {
				logger("No token found");
				this._lock.release();
				return UserProblemStatus.empty();
			}
			// trigger unofficial
			const resp = await this.triggerUnofficial(subUrl, token).then(
				(res) => res.text(),
			);
			dom = load(resp);
		}
		this._lock.release();

		const table = dom("table.status-frame-datatable");
		if (table === null) return UserProblemStatus.empty();
		const rows = table.find("tr:not(.first-row)");
		rows.each((_, row) => {
			const h = dom(row).html();
			const cells = dom(row).find("td");
			const time = dom(cells).find("span.format-time");
			if (!time.length) {
				logger(`No time found in row ${h} of ${account}`);
				return;
			}
			const timeStr = time.text()?.trim();
			if (!timeStr.length) {
				logger(`No time string found in row ${h} of ${account}`);
				return;
			}
			const date = new Date(timeStr);
			if (!isValidDate(date)) {
				return;
			}
			const problemName = dom(cells[3]).text()?.trim();
			if (!problemName.length) {
				logger(`No problem name found in row ${h} of ${account}`);
				return;
			}
			const url = dom(cells[3]).find("a").attr("href");
			if (!url) {
				logger(`No url found in row ${h} of ${account}`);
				return;
			}
			const problemRE = /\/(contest|gym)\/(?<contest>\d*)\/problem\/.*/;
			const match = url.match(problemRE);
			if (!match) {
				logger(
					`No match found in row ${row} of ${account}, url: ${url}`,
				);
				return;
			}
			const contest = match.groups?.contest;
			if (!contest) {
				logger(`No contest found in row ${h} of ${account}`);
				return;
			}
			let contestName;
			if (url.includes("gym")) {
				contestName = `gym ${contest}`;
			} else {
				contestName = `contest ${contest}`;
			}

			const name = `${problemName}`;

			// const status = row.querySelector("span.verdict-accepted");
			const status = dom(row).find("span.verdict-accepted");

			const id = `${contestName}${name}`;
			const problem = {
				platform: "codeforces" as TentacleID,
				id: id,
				title: name,
				contest: contestName,
				url: `https://codeforces.com${url}` ?? "",
			};

			if (status.length !== 0) passProblemIds.add(id);
			problems.push(problem);
		});

		const failedProblemIds = new Set<string>();
		for (const problem of problems) {
			if (!passProblemIds.has(problem.id)) {
				failedProblemIds.add(problem.id);
			}
		}

		const successProblems = Array.from(passProblemIds).map(
			(id) => problems.find((problem) => problem.id === id)!,
		);
		const failedProblems = Array.from(failedProblemIds).map(
			(id) => problems.find((problem) => problem.id === id)!,
		);

		return new UserProblemStatus(
			successProblems,
			failedProblems,
			problems.length,
			level,
			rating,
		);
	}

	async batchFetch(
		accounts: string[],
		logger: LogFunc,
	): Promise<Map<string, UserProblemStatus>> {
		if (!CODEFORCES_GROUP_ID) {
			// no need to execute
			return new Map<string, UserProblemStatus>();
		}

		const submitSuccessIdsMap = new Map<string, Set<string>>();
		const submitMap = new Map<string, Array<Problem>>();
		const submitFailedIdsMap = new Map<string, Set<string>>();

		for (const target of accounts) {
			submitSuccessIdsMap.set(target, new Set<string>());
			submitMap.set(target, new Array<Problem>());
			submitFailedIdsMap.set(target, new Set<string>());
		}

		// logger("Fetching Codeforces group submissions...")
		const res = await this.fakeFetch(
			`https://codeforces.com/group/${CODEFORCES_GROUP_ID}/contests`,
		).then((res) => res.text());
		logger("Fetched Codeforces group submissions");
		const dom = load(res);

		const trs = dom("tr[data-contestId]");
		const contestIds: string[] = [];
		trs.each((_, tr) => {
			const contestId = dom(tr).attr("data-contestid");
			if (contestId) contestIds.push(contestId);
		});
		const contestNames = trs.map((_, tr) => {
			return dom(tr)
				.children("td")
				.eq(0)
				.text()
				.split("\n")
				.map((s) => s.trim())
				.filter((s) => s.length > 0)[0];
		});

		const contestTasks = new Array<Promise<void>>();
		for (let j = 0; j < Math.min(contestIds.length, 8); j++) {
			const contestTask = async () => {
				const url = `https://codeforces.com/group/${CODEFORCES_GROUP_ID}/contest/${contestIds[j]}/status`;

				const singlePageTasks: Promise<void>[] = [];

				for (let i = 3; i >= 1; i--) {
					const singlePageTask = async () => {
						const response = await this.fakeFetch(
							`${url}/page/${i}`,
						).then((res) => res.text());
						logger(
							`Fetched Codeforces contest ${contestNames[j]} submissions page ${i}.`,
						);
						const $ = load(response);

						if (i !== 1) {
							const pageIndex = $("span.page-index.active");
							if (!pageIndex.length) {
								return;
							}
							const index = pageIndex.eq(0).attr("pageindex");
							if (!index || index === "") return;
							if (parseInt(index) !== i) {
								logger(
									`Codeforces contest ${contestNames[j]} submissions page ${i} is not valid.`,
								);
								return;
							}
						}

						const table = $("table.status-frame-datatable");
						if (table === null) return;
						const rows = table.find("tr:not(.first-row)");
						rows.each((_, row) => {
							const cells = $(row).find("td");
							const time = $(cells).find("span.format-time");
							if (!time.length) return;
							const timeStr = time.text()?.trim();
							if (!timeStr) return;
							const date = new Date(timeStr);
							if (!isValidDate(date)) return;

							const submitUser = $(cells.children().eq(2))
								.text()
								?.trim()
								.replaceAll("\n", "")
								.trim();
							if (!submitUser) {
								logger(`No submit user found in row ${row}`);
								return;
							}
							if (!accounts.includes(submitUser)) {
								return;
							}

							const problemID = $(cells.children().eq(3))
								.text()
								?.trim();
							if (!problemID) return;
							const contestName = contestNames[j];
							const name = `${problemID}`;

							const url = cells
								.children()
								.eq(3)
								.eq(0)
								.attr("href");
							if (!url) return;

							const status = $(row).find("span.verdict-accepted");
							const problem = {
								platform: "codeforces" as TentacleID,
								url: `https://codeforces.com${url}` ?? "",
								title: name,
								contest: contestName,
								id: `${contestName}${name}`,
							};

							const submitSuccessIds =
								submitSuccessIdsMap.get(submitUser)!;
							const submits = submitMap.get(submitUser)!;

							if (status.length !== 0)
								submitSuccessIds.add(problem.id);
							submits.push(problem);
						});
					};
					singlePageTasks.push(singlePageTask());
				}
				await Promise.all(singlePageTasks);
			};
			contestTasks.push(contestTask());
		}
		await Promise.all(contestTasks);

		for (const account of accounts) {
			const submitSuccessIds = submitSuccessIdsMap.get(account)!;
			const submits = submitMap.get(account)!;

			for (const problem of submits) {
				if (!submitSuccessIds.has(problem.id)) {
					submitFailedIdsMap.get(account)!.add(problem.id);
				}
			}
		}

		const result = new Map<string, UserProblemStatus>();
		for (const [user, problems] of Array.from(submitMap)) {
			const successProblems = Array.from(
				submitSuccessIdsMap.get(user)!,
			).map((id) => problems.find((problem) => problem.id === id)!);
			const failedProblems = Array.from(
				submitFailedIdsMap.get(user)!,
			).map((id) => problems.find((problem) => problem.id === id)!);
			result.set(
				user,
				new UserProblemStatus(
					successProblems,
					failedProblems,
					problems.length,
				),
			);
		}
		return result;
	}

	async fakeFetch(url: string) {
		return await fetch(url, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
				Cookie: `RCPC=${this._token};`,
			},
		});
	}

	async triggerUnofficial(url: string, token: string) {
		const data = new FormData();
		data.append("csrf_token", token);
		data.append("action", "toggleShowUnofficial");
		data.append("_tta", "5");
		return await fetch(url, {
			method: "POST",
			redirect: "follow",
			body: data,
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
				Cookie: `RCPC=${this._token};`,
			},
		});
	}
}
