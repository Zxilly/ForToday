import { client } from "../../../constants";
import { getNewTimedLogger, readData } from "../../../utils/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	const logger = getNewTimedLogger();

	const data = await readData(client, logger);
	if (data) {
		logger("Data exists, returning...");
		return Response.json(JSON.parse(data));
	} else {
		logger("Data does not exist, aborting...");
		return Response.json({ message: "Data does not exist" }, {
			status: 404,
		})
	}
}
