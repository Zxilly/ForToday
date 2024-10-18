import { Tentacle, UserProblemStatus } from "../types/tentacle";
import { LogFunc, RateLimiter, isValidDate } from "../utils/utils";
import { LuoguSavedToken } from "../types/luogu";
import { readLuoguToken } from "../utils/repo";
import { BaseURL } from "../constant/server-consts";
import { ProblemHelper } from "./helper";

export class LuoguDelegateTentacle implements Tentacle {
	private token: LuoguSavedToken | null = null;
	private _limiter = new RateLimiter(1000);

	async fetch(account: string, _logger: LogFunc): Promise<UserProblemStatus> {
		if (!this.token) {
			throw new Error("Luogu token not found");
		}

		await this._limiter.canExecute();

		const data = await this.fetchData(account, this.token.uid, this.token.client_id);

		return UserProblemStatus.fromObject(data);
	}

	async requireAuth(logger: LogFunc): Promise<boolean> {
		const token = await readLuoguToken(logger);
		if (!token) {
			return false;
		}

		await this._limiter.canExecute();
		const ok = await this.checkToken(token.uid, token.client_id);

		if (!ok) {
			return false;
		}

		this.token = token;

		return true;
	}

	async checkToken(uid: string, client_id: string): Promise<boolean> {
		const resp = await fetch(
			"https://www.luogu.com.cn/record/list?user=109757&page=1&_contentOnly=1",
			{
				headers: {
					Cookie: `_uid=${uid}; __client_id=${client_id};`,
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
				},
			},
		);

		const data = await resp.json();

		return data.currentTemplate === "RecordList";
	}

	async fetchData(account: string, uid: string, client_id: string): Promise<any> {
		let earliest_submission_time = new Date().getTime();

		const helper = new ProblemHelper();
		for (let i = 1; ; i++) {
			const resp = await fetch(
				`https://www.luogu.com.cn/record/list?user=${account}&page=${i}&_contentOnly=1`,
				{
					headers: {
						Cookie: `_uid=${uid}; __client_id=${client_id};`,
						"User-Agent":
							"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
					},
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
