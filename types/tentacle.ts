export class ProblemStatus {
    pass: string[];
    failed: string[];
    submitted: number;

    constructor(pass: string[], failed: string[], submitted: number) {
        this.pass = pass;
        this.failed = failed;
        this.submitted = submitted;
    }

    static merge(...statuses: ProblemStatus[]): ProblemStatus {
        let pass: Set<string> = new Set();
        let failed: Set<string> = new Set();
        let submitted: number = 0;
        for (let status of statuses) {
            for (let p of status.pass) {
                pass.add(p);
            }
            for (let f of status.failed) {
                failed.add(f);
            }
            submitted += status.submitted;
        }
        return new ProblemStatus(Array.from(pass), Array.from(failed), submitted);
    }
}

export interface Tentacle {
    coolDown: number
    fetch: (account: string) => Promise<ProblemStatus>;
    batchFetch?: (accounts: string[]) => Promise<Map<string, ProblemStatus>>;
}

export type TentacleID = "codeforces"

export interface Target {
    name: string;
    accounts: Record<Partial<TentacleID>, string>
}
