import type { Target } from "./types/tentacle";
import { Redis } from "@upstash/redis";

export const targets: Target[] = [
  {
    name: "AgOH",
    accounts: {
      codeforces: "AgOH",
      nowcoder: "409383157",
      luogu: "109757",
      atcoder: "AgOH"
    }
  },
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

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL as string,
  token: process.env.UPSTASH_REDIS_REST_TOKEN as string
});

export const client = redis;