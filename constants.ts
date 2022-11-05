import type { Target } from "./types/tentacle";
import getConfig from "next/config";
import Redis from "ioredis";

export const targets: Target[] = [
    {
        name: "Algor_",
        accounts: {
            codeforces: "Algor_"
        }
    },
    {
        name: "hirsute",
        accounts: {
            codeforces: "hirsute"
        }
    },
    {
        name: "suidingyunmeinv",
        accounts: {
            codeforces: "suidingyunmeinv"
        }
    },
    {
        name: "Vionia",
        accounts: {
            codeforces: "Vionia"
        }
    },
    {
        name: "YuNostalgia",
        accounts: {
            codeforces: "YuNostalgia"
        }
    },
    {
        name: "AgOH",
        accounts: {
            codeforces: "AgOH",
            nowcoder: "409383157"
        }
    },
    {
        name: "GlenBzc",
        accounts: {
            codeforces: "GlenBzc"
        }
    },
    {
        name: "Zxilly",
        accounts: {
            codeforces: "zxilly"
        }
    }
];

export const CODEFORCES_GROUP_ID = "MlnUj8Knxs";

const { serverRuntimeConfig } = getConfig();
export const client = new Redis(serverRuntimeConfig.redisUrl);
