import type { Target } from "./types/tentacle";
import getConfig from "next/config";
import Redis from "ioredis";

export const targets: Target[] = [
    {
        name: "Algor_",
        accounts: {
            codeforces: "Algor_",
            nowcoder: "490231204",
            luogu: "595131"
        }
    },
    {
        name: "Eronano",
        accounts: {
            codeforces: "Eronano",
            nowcoder: "164309574",
            luogu: "819543"
        }
    },
    {
        name: "tiaokeng",
        accounts: {
            codeforces: "tiaokeng",
            nowcoder: "975854327",
            luogu: "883228"
        }
    },
    {
        name: "orange.",
        accounts: {
            codeforces: "orange.",
            nowcoder: "147050991",
            luogu: "818346"
        }
    },
    {
        name: "Vionia",
        accounts: {
            codeforces: "Vionia",
            nowcoder: "275695985",
            luogu: "817534"
        }
    },
    {
        name: "YuNostalgia",
        accounts: {
            codeforces: "YuNostalgia",
            nowcoder: "210034723",
            luogu: "821080"
            
        }
    },
    {
        name: "AgOH",
        accounts: {
            codeforces: "AgOH",
            nowcoder: "409383157",
            luogu: "109757"
        }
    }
];

export const CODEFORCES_GROUP_ID = "MlnUj8Knxs";

const { serverRuntimeConfig } = getConfig();
export const client = new Redis(serverRuntimeConfig.redisUrl);
