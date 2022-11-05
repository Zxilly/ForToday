import type { Tentacle, TentacleID } from "../types/tentacle";
import { CodeforcesTentacle } from "./codeforces";
import { targets } from "../constants";
import { UserProblemStatus } from "../types/tentacle";
import { LogFunc } from "../utils/utils";

const tentaclesImpl: Record<TentacleID, Tentacle> = {
    codeforces: new CodeforcesTentacle()
};

export async function fetchAll(logger: LogFunc): Promise<Record<string, UserProblemStatus>>
{
    const users = targets.map(t => t.name);
    const result: Record<string, UserProblemStatus> = {};
    for(const user of users)
    {
        result[user] = new UserProblemStatus([], [], 0);
    }

    const tasks: Promise<void>[] = [];
    for(const [key, impl] of Object.entries(tentaclesImpl))
    {
        // logger(`Fetching ${key}...`)
        const task = async () =>
        {
            const subtasks: Promise<void>[] = [];
            const validTargets = targets.filter(target => Object.hasOwn(target.accounts, key));
            for(const target of validTargets)
            {
                const account = target.accounts[key as TentacleID];
                // logger(`Fetching ${key} ${account}...`)
                const subtask = async () =>
                {
                    const status = await impl.fetch(account, logger);
                    result[target.name] = UserProblemStatus.merge(result[target.name], status);
                    logger(`Fetched ${key} ${account}.`);
                };
                subtasks.push(subtask());
            }
            await Promise.all(subtasks);
        };
        tasks.push(task());
    }

    for(const [key, impl] of Object.entries(tentaclesImpl))
    {
        const task = async () =>
        {
            if(!(impl.batchFetch))
            {
                return;
            }

            // logger(`Fetching ${key} all...`)
            const accounts = targets.filter(target => Object.hasOwn(target.accounts, key)).map(target => target.accounts[key as TentacleID]);
            const statuses = await impl.batchFetch!(accounts, logger);
            for(const [account, status] of Array.from(statuses))
            {
                const name = targets.find(target => target.accounts[key as TentacleID] === account)!.name;
                result[name] = UserProblemStatus.merge(result[name], status);
            }
            logger(`Fetched ${key} all.`);
        };
        tasks.push(task());
    }
    await Promise.all(tasks);
    return result;
}
