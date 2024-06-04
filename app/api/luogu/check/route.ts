import { getNewTimedLogger } from "../../../../utils/utils";
import { LuoguToken } from "../../../../types/luogu";
import { checkLuoguToken } from "../../../../utils/luogu";
import { InvalidRequestError } from "../../../../constant/server-consts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	const logger = getNewTimedLogger();

	const { uid, client_id } = (await request.json()) as LuoguToken;
	if (!uid || !client_id) {
		return InvalidRequestError;
	}
	logger(`uid: ${uid}, client_id: ${client_id}`);

	const result = await checkLuoguToken({ uid, client_id });
	return Response.json(result);
}
