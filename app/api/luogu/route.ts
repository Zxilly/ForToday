import { getNewTimedLogger } from "../../../utils/utils";
import { LuoguToken } from "../../../types/luogu";
import { LuoguTentacle } from "../../../tentacle/luogu";
import { writeLuoguToken } from "../../../utils/repo";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	const logger = getNewTimedLogger();

	const { uid, client_id } = (await request.json()) as LuoguToken;
	if (!uid || !client_id) {
		return Response.json(
			{ message: "Invalid Request" },
			{
				status: 400,
			},
		);
	}
	logger(`uid: ${uid}, client_id: ${client_id}`);

	const result = await LuoguTentacle.check({ uid, client_id });
	if (!result) {
		return Response.json(
			{ message: "Invalid Token" },
			{
				status: 400,
			},
		);
	}

	logger("Saving...");
	await writeLuoguToken(
		{
			uid,
			client_id,
			timestamp: new Date().getTime(),
		},
		logger,
	);
	logger("Saved.");
	return Response.json({ message: "OK", time: new Date().getTime() });
}
