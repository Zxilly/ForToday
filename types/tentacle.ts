import { LogFunc } from "../utils/utils";

export type Problem = {
    id: string
    platform: TentacleID
    contest: string
    title: string
    url: string
}

export type SuccessProblem = Problem & { success: boolean }

type safeFunction = (...args: any[]) => any
export type PureUserProblemStatus = {
    [k in keyof UserProblemStatus]: UserProblemStatus[k] extends safeFunction ? never : UserProblemStatus[k]
}

export class UserProblemStatus
{
    pass: Problem[];
    failed: Problem[];
    submitted: number;
    rank?: number = -1;

    constructor(pass: Problem[], failed: Problem[], submitted: number, rank = -1)
    {
        this.pass = pass;
        this.failed = failed;
        this.submitted = submitted;
        this.rank = rank;
    }


    // eslint-disable-next-line @typescript-eslint/ban-types
    public static fromObject(obj: PureUserProblemStatus): UserProblemStatus
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
        let rank = -1;
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
            if(status.rank !== undefined && status.rank > 0)
            {
                rank = status.rank;
            }
        }
        return new UserProblemStatus(Array.from(pass), Array.from(failed), submitted, rank);
    }
}

export interface Tentacle
{
    fetch: (account: string, logger: LogFunc) => Promise<UserProblemStatus>;
    batchFetch?: (accounts: string[], logger: LogFunc) => Promise<Map<string, UserProblemStatus>>;
}

export type TentacleID = "codeforces" | "nowcoder"

export interface Target
{
    name: string;
    accounts: Partial<Record<TentacleID, string>>;
}
