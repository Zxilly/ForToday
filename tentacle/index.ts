import type { Tentacle, TentacleID } from "../types/tentacle";
import { UserProblemStatus } from "../types/tentacle";
import { CodeforcesTentacle } from "./codeforces";
import { targets } from "../constants";
import { LogFunc } from "../utils/utils";
import { NowCoderTentacle } from "./nowcoder";
import { LuoguTentacle } from "./luogu";
import { AtcoderTentacle } from "./atcoder";

const tentaclesImpl: Record<TentacleID, Tentacle> = {
    codeforces: new CodeforcesTentacle(),
    nowcoder: new NowCoderTentacle(),
    luogu: new LuoguTentacle(),
    atcoder: new AtcoderTentacle()
};

export async function fetchAll(logger: LogFunc): Promise<Record<string, UserProblemStatus>>
{
    const users = targets.map(t => t.name);
    const result: Record<string, UserProblemStatus> = {};
    for(const user of users)
    {
        result[user] = UserProblemStatus.empty();
    }

    const tasks: Promise<void>[] = [];
    for(const [key, impl] of Object.entries(tentaclesImpl))
    {
        if(impl.requireAuth)
        {
            if(!await impl.requireAuth(logger))
            {
                logger(`Skip ${key} because of auth failed`);
                continue;
            }
        }

        const task = async () =>
        {
            const subtasks: Promise<void>[] = [];
            const validTargets = targets.filter(target => Object.hasOwn(target.accounts, key));
            for(const target of validTargets)
            {
                const account = target.accounts[key as TentacleID]!;
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
        if(!(impl.batchFetch))
        {
            continue;
        }

        if(impl.requireAuth)
        {
            if(!await impl.requireAuth(logger))
            {
                logger(`Skip ${key} because of auth failed`);
                continue;
            }
        }

        const task = async () =>
        {
            // logger(`Fetching ${key} all...`)
            const accounts = targets.filter(target => Object.hasOwn(target.accounts, key)).map(target => target.accounts[key as TentacleID]!);
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
