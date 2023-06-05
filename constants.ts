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
        name: "Eronano",
        accounts: {
            codeforces: "Eronano"
        }
    },
    {
        name: "tiaokeng",
        accounts: {
            codeforces: "tiaokeng"
        }
    },
    {
        name: "orange.",
        accounts: {
            codeforces: "orange."
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
            nowcoder: "409383157",
            luogu: "109757",
            atcoder: "AgOH"
        }
    }
];

export const CODEFORCES_GROUP_ID = "MlnUj8Knxs";

const { serverRuntimeConfig } = getConfig();
export const client = new Redis(serverRuntimeConfig.redisUrl);
