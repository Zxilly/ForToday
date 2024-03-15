import { LuoguSavedToken } from "../types/luogu";
import { client } from "../constant/server-consts";
import { PureUserProblemStatus } from "../types/tentacle";
import { LogFunc } from "./utils";
import "server-only";

export async function readData(
	log?: LogFunc,
): Promise<Record<string, PureUserProblemStatus> | null> {
	log?.("Reading data...");
	const data =
		await client.get<Record<string, PureUserProblemStatus>>("data");
	log?.("Read data.");
	if (!data) {
		log?.("Data not found.");
		return null;
	}
	return data;
}

export async function writeData(
	data: Record<string, PureUserProblemStatus>,
	log?: LogFunc,
): Promise<void> {
	log?.("Writing data...");
	await client.set("data", data);
	log?.("Wrote data.");
}

export async function readLuoguToken(
	log?: LogFunc,
): Promise<LuoguSavedToken | null> {
	log?.("Reading luogu token...");
	const data = await client.get<LuoguSavedToken>("luogu_token");
	if (!data) {
		log?.("Luogu token not found.");
		return null;
	}
	log?.("Read luogu token.");
	return data;
}

export async function writeLuoguToken(
	token: LuoguSavedToken,
	log?: LogFunc,
): Promise<void> {
	log?.("Writing luogu token...");
	await client.set("luogu_token", token);
	log?.("Wrote luogu token.");
}

const lockKey = "datalock";

export async function acquireDataLock(log?: LogFunc): Promise<boolean> {
	log?.("Acquiring data lock...");

	const lock = await client.setnx(lockKey, "1");
	if (!lock) {
		log?.("Lock exists, aborting...");
		return false;
	}
	await client.expire(lockKey, 15);
	log?.("Lock acquired.");
	return true;
}

export async function releaseDataLock(log?: LogFunc): Promise<void> {
	log?.("Releasing data lock...");
	await client.del(lockKey);
	log?.("Lock released.");
}
