import { Tentacle, UserProblemStatus } from "../types/tentacle";
import { isValidDate, LogFunc, RateLimiter } from "../utils/utils";
import { readLuoguToken } from "../utils/repo";
import { ProblemHelper } from "./helper";
import { type LuoguSavedToken } from "../types/luogu";
import { parse, serialize } from "cookie";

export class LuoguTentacle implements Tentacle {
	private token: LuoguSavedToken | null = null;
	private _limiter = new RateLimiter(1000);

	async fetch(account: string, _logger: LogFunc): Promise<UserProblemStatus> {
		if (!this.token) {
			throw new Error("Luogu token not found");
		}

		await this._limiter.canExecute();

		const data = await this.fetchData(
			account,
			this.token.uid,
			this.token.client_id,
		);

		return UserProblemStatus.fromObject(data);
	}

	async requireAuth(logger: LogFunc): Promise<boolean> {
		const token = await readLuoguToken(logger);
		if (!token) {
			return false;
		}

		await this._limiter.canExecute();
		const ok = await LuoguTentacle.checkToken(token.uid, token.client_id);
		if (!ok) {
			return false;
		}

		this.token = token;

		return true;
	}

	static async checkToken(uid: string, client_id: string): Promise<boolean> {
		const resp = await enhancedFetch(
			"https://www.luogu.com.cn/record/list?user=109757&page=1&_contentOnly=1",
			{
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
				},
			},
			{
				_uid: uid,
				__client_id: client_id,
			},
		);

		const data = await resp.json();

		return data.currentTemplate === "RecordList";
	}

	async fetchData(
		account: string,
		uid: string,
		client_id: string,
	): Promise<any> {
		let earliest_submission_time = new Date().getTime();

		const helper = new ProblemHelper();
		for (let i = 1; ; i++) {
			const resp = await enhancedFetch(
				`https://www.luogu.com.cn/record/list?user=${account}&page=${i}&_contentOnly=1`,
				{
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
					},
				},
				{
					_uid: uid,
					__client_id: client_id,
				},
			);

			const data = await resp.json();
			if (data.currentTemplate !== "RecordList") {
				throw new Error("Invalid Token");
			}

			for (const record of data.currentData.records.result) {
				const time = record.submitTime;
				earliest_submission_time = Math.min(
					earliest_submission_time,
					time * 1000,
				);
				if (!isValidDate(new Date(time * 1000))) {
					break;
				}

				const id = `luogu-${record.problem.pid}`;
				helper.add_problem(id, record.status === 12, {
					id,
					platform: "luogu",
					contest: record.contest?.name ?? "",
					title: `${record.problem.pid} ${record.problem.title}`,
					problemUrl: `https://www.luogu.com.cn/problem/${record.problem.pid}`,
				});
			}

			if (data.currentData.records.count < 20) {
				break;
			}
			if (!isValidDate(new Date(earliest_submission_time))) {
				break;
			}
		}
		return helper.get_status();
	}
}

export interface EnhancedFetchOptions extends Omit<RequestInit, "redirect"> {
	maxRedirects?: number;
}

export async function enhancedFetch(
	url: string,
	options: EnhancedFetchOptions = {},
	cookieJar: Record<string, string> = {},
): Promise<Response> {
	const maxRedirects = options.maxRedirects ?? 20;
	let redirectCount = 0;

	async function fetchWithCookies(
		url: string,
		options: EnhancedFetchOptions,
	): Promise<Response> {
		if (redirectCount >= maxRedirects) {
			throw new Error(
				`Maximum number of redirects (${maxRedirects}) exceeded`,
			);
		}

		const headers = new Headers(options.headers || {});

		if (Object.keys(cookieJar).length > 0) {
			const cookieString = Object.entries(cookieJar)
				.map(([name, value]) => serialize(name, value))
				.join("; ");
			headers.set("Cookie", cookieString);
		}

		const response = await fetch(url, {
			...options,
			headers,
			redirect: "manual",
		});

		const setCookieHeaders = response.headers.getSetCookie();
		for (const header of setCookieHeaders) {
			const parsedCookie = parse(header);
			Object.assign(cookieJar, parsedCookie);
		}

		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get("location");
			if (location) {
				redirectCount++;
				const redirectUrl = new URL(location, url).toString();
				return fetchWithCookies(redirectUrl, options);
			}
		}

		return response;
	}

	return fetchWithCookies(url, options);
}
