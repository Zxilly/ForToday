import { LuoguToken } from "../types/luogu";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import http from "http";
import dns from "dns";
import https from "https";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

const jar = new CookieJar();

export async function checkLuoguToken(token: LuoguToken): Promise<boolean> {
	const resp = (
		await luoguFetch(
			"https://www.luogu.com.cn/record/list?user=109757&page=1&_contentOnly=1",
			token.uid,
			token.client_id,
		)
	).data;

	return resp.currentTemplate === "RecordList";
}

const customDNSLookup = (
	hostname: string,
	options: dns.LookupOptions,
	callback: (
		err: NodeJS.ErrnoException | null,
		address: any,
		family: number,
	) => void,
): void => {
	return dns.lookup(
		"www.luogu.com.cn.wswebpic.com",
		options,
		(err, address, family) => {
			callback(err, address, family);
		},
	);
};

const httpAgent = new http.Agent({ lookup: customDNSLookup });
const httpsAgent = new https.Agent({ lookup: customDNSLookup });

export const customAxios: AxiosInstance = wrapper(
	axios.create({
		httpAgent,
		httpsAgent,
		jar,
	}),
);

export async function luoguFetch(
	url: string,
	uid: string,
	client_id: string,
): Promise<AxiosResponse<any, any>> {
	return await customAxios.get(url, {
		headers: {
			Cookie: `_uid=${uid}; __client_id=${client_id};`,
			"User-Agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
		},
		timeout: 3000,
		withCredentials: true,
	});
}
