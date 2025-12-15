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
		const resp = await fetch("https://mirror.codeforces.com/").then((r) =>
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

	async fakeFetch(url: string) {
		return await fetch(url, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
				Cookie: `RCPC=${this._token};`,
			},
		});
	}
}
