import { Problem, Tentacle, UserProblemStatus } from "../types/tentacle";
import { load } from "cheerio";
import { CODEFORCES_GROUP_ID } from "../constant/server-consts";
import { isValidDate, LogFunc, RateLimiter, ratingParse } from "../utils/utils";
import { slowAES, toHex, toNumbers } from "../utils/cf";
import AwaitLock from "await-lock";
import { targets } from "../constant/consts";
import { type Submission, User } from "codeforces-api-ts/dist/types";

export type Response<T> =
	| {
			status: "OK";
			result: T;
	  }
	| {
			status: "FAILED";
			comment: string;
	  };

export class CodeforcesTentacle implements Tentacle {
	private _token = "";
	private _limiter = new RateLimiter(2000);

	private _ratingCache = new Map<string, number>();
	private _ratingCached = false;
	private _ratingMutex = new AwaitLock();

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

	async callApi<T>(
		endpoint: string,
		params: Record<string, string> = {},
	): Promise<Response<T>> {
		const url = new URL(`https://codeforces.com/api/${endpoint}`);
		for (const key in params) {
			url.searchParams.append(key, params[key]);
		}
		return await (
			await fetch(url, {
				keepalive: true,
			})
		).json();
	}

	async getRating(account: string): Promise<number | undefined> {
		await this._ratingMutex.acquireAsync();

		if (!this._ratingCached) {
			await this._limiter.canExecute();
			const handles = targets.map((x) => x.accounts.codeforces).join(";");
			const resp = await this.callApi<User[]>("user.info", { handles });
			if (resp.status === "FAILED") {
				this._ratingMutex.release();
				throw new Error(`Failed to fetch rating, ${resp.comment}`);
			}
			for (const u of resp.result) {
				this._ratingCache.set(u.handle, u.rating || -1);
			}
			this._ratingCached = true;
		}

		const rating = this._ratingCache.get(account);
		this._ratingMutex.release();
		return rating;
	}

	async getContest(id: number | undefined): Promise<[string, string]> {
		if (!id) {
			return ["PRACTICE", ""];
		}

		const contestUrl =
			id >= 100000
				? `https://codeforces.com/gym/${id}`
				: `https://codeforces.com/contest/${id}`;

		const name = id >= 100000 ? `Gym ${id}` : `Contest ${id}`;

		return [name, contestUrl];
	}

	async fetch(account: string, logger: LogFunc): Promise<UserProblemStatus> {
		const passProblemIds = new Set<string>();
		const problems = new Array<Problem>();

		const rating = await this.getRating(account);
		if (rating === undefined) {
			logger(`Failed to fetch rating for ${account}`);
			return UserProblemStatus.empty();
		}

		const level = ratingParse(rating);

		await this._limiter.canExecute();

		const submissions = await this.callApi<Submission[]>("user.status", {
			handle: account,
			count: "100",
		});

		if (submissions.status === "FAILED") {
			logger(
				`Failed to fetch submissions for ${account}, ${submissions.comment}`,
			);
			return UserProblemStatus.empty();
		}

		for (const sub of submissions.result) {
			const time = new Date(sub.creationTimeSeconds * 1000);
			if (!isValidDate(time)) {
				continue;
			}
			const problemName = `${sub.problem.index} - ${sub.problem.name}`;
			const contestId = sub.contestId;
			const [contestName, contestUrl] = await this.getContest(contestId);

			const url = `https://codeforces.com/contest/${contestId}/problem/${sub.problem.index}`;
			const id = `${contestName}${problemName}`;
			const problem: Problem = {
				platform: "codeforces",
				id: id,
				title: problemName,
				contest: contestName,
				contestUrl: contestUrl,
				problemUrl: url,
			};
			if (sub.verdict === "OK") {
				passProblemIds.add(id);
			}
			problems.push(problem);
		}

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
							const problem: Problem = {
								platform: "codeforces",
								problemUrl:
									`https://codeforces.com${url}` ?? "",
								title: name,
								contest: contestName,
								contestUrl: `https://codeforces.com/group/${CODEFORCES_GROUP_ID}/contest/${contestIds[j]}`,
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
