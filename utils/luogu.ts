import { LuoguToken } from "../types/luogu";

export async function checkLuoguToken(token: LuoguToken): Promise<boolean> {
	const resp = await fetch(
		"https://www.luogu.com.cn/record/list?user=109757&page=1&_contentOnly=1",
		{
			headers: {
				Cookie: `_uid=${token.uid}; __client_id=${token.client_id};`,
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
			},
		},
	);

	const data = await resp.json();

	return data.currentTemplate === "RecordList";
}
