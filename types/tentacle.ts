import { LogFunc } from "../utils/utils";

export type Problem = {
	id: string;
	platform: TentacleID;
	contest: string;
	contestUrl?: string;
	title: string;
	problemUrl: string;
};

export type ProblemWithStatus = Problem & { success: boolean };

type safeFunction = (...args: any[]) => any;
export type PureUserProblemStatus = {
	[k in keyof UserProblemStatus]: UserProblemStatus[k] extends safeFunction
		? never
		: UserProblemStatus[k];
};

export class UserProblemStatus {
	pass: Problem[];
	failed: Problem[];
	submitted: number;
	level = -1;
	rating = -1;

	constructor(
		pass: Problem[],
		failed: Problem[],
		submitted: number,
		level = -1,
		rating = -1,
	) {
		this.pass = pass;
		this.failed = failed;
		this.submitted = submitted;
		this.level = level;
		this.rating = rating;
	}

	public static fromObject(obj: PureUserProblemStatus): UserProblemStatus {
		return new UserProblemStatus(
			obj.pass,
			obj.failed,
			obj.submitted,
			obj.level,
			obj.rating,
		);
	}

	public getAll(): ProblemWithStatus[] {
		const all: ProblemWithStatus[] = [];
		for (const problem of this.pass) {
			all.push({ ...problem, success: true });
		}
		for (const problem of this.failed) {
			all.push({ ...problem, success: false });
		}
		return all;
	}

	static merge(...statuses: UserProblemStatus[]): UserProblemStatus {
		const pass: Set<Problem> = new Set();
		const failed: Set<Problem> = new Set();
		let submitted = 0;
		let rating = -1;
		let level = -1;
		for (const status of statuses) {
			for (const problem of status.pass) {
				pass.add(problem);
			}
			for (const problem of status.failed) {
				failed.add(problem);
			}
			submitted += status.submitted;
			if (status.level !== undefined && status.level >= 0) {
				level = status.level;
			}
			if (status.rating !== undefined && status.rating >= 0) {
				rating = status.rating;
			}
		}
		return new UserProblemStatus(
			Array.from(pass),
			Array.from(failed),
			submitted,
			level,
			rating,
		);
	}

	static empty() {
		return new UserProblemStatus([], [], 0);
	}
}

type AtLeast<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export interface Tentacle {
	fetch: (account: string, logger: LogFunc) => Promise<UserProblemStatus>;
	batchFetch?: (
		accounts: string[],
		logger: LogFunc,
	) => Promise<Map<string, UserProblemStatus>>;

	requireAuth?: (logger: LogFunc) => Promise<boolean>;
}

export type TentacleID = "codeforces" | "nowcoder" | "luogu" | "atcoder";

export interface Target {
	name: string;
	// codeforces account is necessary to render the rank color
	accounts: AtLeast<Record<TentacleID, string>, "codeforces">;
}
