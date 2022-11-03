import type {Tentacle, TentacleID} from "../types/tentacle";
import {CodeforcesTentacle} from "./codeforces";
import {targets} from "../constants";
import {ProblemStatus} from "../types/tentacle";

const tentaclesImpl: Record<TentacleID, Tentacle> = {
    codeforces: new CodeforcesTentacle()
}

export async function fetchAll() {
    const users = targets.map(t => t.name)
    const result: Record<string, ProblemStatus> = {}
    for (const user of users) {
        result[user] = new ProblemStatus([], [], 0)
    }

    const tasks: Promise<void>[] = [];
    for (const [key, impl] of Object.entries(tentaclesImpl)) {
        console.log(`Fetching ${key}...`)
        const task = async () => {
            const validTargets = targets.filter(target => Object.hasOwn(target.accounts, key))
            for (const target of validTargets) {
                const account = target.accounts[key as TentacleID]
                console.log(`Fetching ${key} ${account}...`)
                const status = await impl.fetch(account);
                result[target.name] = ProblemStatus.merge(result[target.name], status)
                console.log(`Fetched ${key} ${account}.`)
                await sleep(impl.coolDown)
            }
        }
        tasks.push(task());
    }

    await Promise.all(tasks);

    for (const [key, impl] of Object.entries(tentaclesImpl)) {
        if (!(impl.batchFetch)) {
            continue
        }

        console.log(`Fetching ${key} all...`)
        const accounts = targets.filter(target => Object.hasOwn(target.accounts, key)).map(target => target.accounts[key as TentacleID]);
        const statuses = await impl.batchFetch!!(accounts);
        for (const [account, status] of Array.from(statuses)) {
            const name = targets.find(target => target.accounts[key as TentacleID] === account)!!.name
            result[name] = ProblemStatus.merge(result[name], status)
        }
        console.log(`Fetched ${key} all.`)
    }

    return result;
}

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
