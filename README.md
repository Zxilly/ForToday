# ForToday

统计算法竞赛选手最近 7 天内的解题数量

![image](https://github.com/Zxilly/ForToday/assets/31370133/0a37cf94-f8da-47cc-be3b-664e03ff1164)

## 支持

当前支持以下平台

-   [洛谷](https://www.luogu.com.cn/)
-   [Codeforces](https://codeforces.com/)
-   [NowCoder](https://ac.nowcoder.com/)

> Codeforces 支持获取组织内部 VP 的数据，需要设置 `server-consts.ts` 中的 `CODEFORCES_GROUP_ID`

> 由于洛谷的平台限制，爬取数据需要一个洛谷账号的 cookies，可以在网页中按 `Ctrl + Q` 后输入自己的洛谷 `Cookie`

> Cookie 数据会被保存在 redis 中，对访问者不可见

## 使用方法

1. 修改 `constant/consts.ts` 中的 `targets` 变量，设置需要统计的用户列表
2. 部署到 `vercel`，同时启动一个 UPSTASH `redis` 实例，并设置 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN` 两个环境变量。

> 如果需要爬取 CodeForces 组织内部 VP 数据，需要设置 `CODEFORCES_GROUP_ID` 环境变量。

## LICENSE

MIT
