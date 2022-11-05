import { LogFunc } from "../utils/utils";

export type Problem = {
    id: string
    platform: TentacleID
    contest: string
    title: string
    url: string
}

export type SuccessProblem = Problem & { success: boolean }

export class UserProblemStatus
{
    pass: Problem[];
    failed: Problem[];
    submitted: number;

    constructor(pass: Problem[], failed: Problem[], submitted: number)
    {
        this.pass = pass;
        this.failed = failed;
        this.submitted = submitted;
    }


    public static fromObject(obj: any): UserProblemStatus
    {
        return new UserProblemStatus(obj.pass, obj.failed, obj.submitted);
    }

    public getAll(): SuccessProblem[]
    {
        const all: SuccessProblem[] = [];
        for(const problem of this.pass)
        {
            all.push({ ...problem, success: true });
        }
        for(const problem of this.failed)
        {
            all.push({ ...problem, success: false });
        }
        return all;
    }

    static merge(...statuses: UserProblemStatus[]): UserProblemStatus
    {
        const pass: Set<Problem> = new Set();
        const failed: Set<Problem> = new Set();
        let submitted = 0;
        for(const status of statuses)
        {
            for(const problem of status.pass)
            {
                pass.add(problem);
            }
            for(const problem of status.failed)
            {
                failed.add(problem);
            }
            submitted += status.submitted;
        }
        return new UserProblemStatus(Array.from(pass), Array.from(failed), submitted);
    }
}

export interface Tentacle {
    fetch: (account: string, logger: LogFunc) => Promise<UserProblemStatus>;
    batchFetch?: (accounts: string[], logger: LogFunc) => Promise<Map<string, UserProblemStatus>>;
}

export type TentacleID = "codeforces"

export interface Target {
    name: string;
    accounts: Record<Partial<TentacleID>, string>
}
