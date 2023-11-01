import type { Target } from "./types/tentacle";
import getConfig from "next/config";
import Redis from "ioredis";

export const targets: Target[] = [
    {
        name: "Eronano",
        accounts: {
            codeforces: "Eronano",
            nowcoder: "164309574",
            luogu: "819543"
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
        name: "Jaysea",
        accounts: {
            codeforces: "Jaysea",
            luogu: "970976"
        }
    },
    {
        name: "Go1ng",
        accounts: {
            codeforces: "Go1ng",
            luogu: "1145552"
        }
    },
    {
        name: "ahit_UX",
        accounts: {
            codeforces: "ahit_UX",
            luogu: "1124141"
        }
    },
    {
        name: "aword",
        accounts: {
            codeforces: "aword",
            luogu: "1137534"
        }
    }
];

export const CODEFORCES_GROUP_ID = "MlnUj8Knxs";

const { serverRuntimeConfig } = getConfig();
export const client = new Redis(serverRuntimeConfig.redisUrl);
