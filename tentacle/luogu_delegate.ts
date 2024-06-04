import { Tentacle, UserProblemStatus } from "../types/tentacle";
import { LogFunc, RateLimiter } from "../utils/utils";
import { LuoguSavedToken } from "../types/luogu";
import { readLuoguToken } from "../utils/repo";
import { BaseURL } from "../constant/server-consts";

export class LuoguDelegateTentacle implements Tentacle {
	private token: LuoguSavedToken | null = null;
	private _limiter = new RateLimiter(1000);

	async fetch(account: string, logger: LogFunc): Promise<UserProblemStatus> {
		if (!this.token) {
			throw new Error("Luogu token not found");
		}

		await this._limiter.canExecute();
		console.warn(`fetch luogu ${account} delegate can execute`);
		const resp = await fetch(BaseURL + "/api/luogu/fetch", {
			method: "POST",
			body: JSON.stringify({
				uid: this.token.uid,
				client_id: this.token.client_id,
				account,
			}),
			signal: AbortSignal.timeout(5000),
		});

		if (!resp.ok) {
			throw new Error(`Failed to fetch data from Luogu for ${account}`);
		}

		const data = await resp.json();

		if (!data) {
			throw new Error(`Failed to fetch data from Luogu for ${account}`);
		}

		return UserProblemStatus.fromObject(data);
	}

	async requireAuth(logger: LogFunc): Promise<boolean> {
		const token = await readLuoguToken(logger);
		if (!token) {
			return false;
		}

		await this._limiter.canExecute();
		const ok = <boolean>await fetch(BaseURL + "/api/luogu/check", {
			method: "POST",
			body: JSON.stringify(token),
		}).then((resp) => resp.json());

		if (!ok) {
			return false;
		}

		this.token = token;

		return true;
	}
}
