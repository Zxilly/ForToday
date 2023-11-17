import { getNewTimedLogger } from "../../../utils/utils";
import { readData } from "../../../utils/repo";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
	const logger = getNewTimedLogger();

	const data = await readData(logger);
	if (data) {
		logger("Data exists, returning...");
		return Response.json(data);
	} else {
		logger("Data does not exist, aborting...");
		return Response.json(
			{ message: "Data does not exist" },
			{
				status: 404,
			},
		);
	}
}
