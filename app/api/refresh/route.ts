import { fetchAll } from "../../../tentacle";
import { client } from "../../../constants";
import { getNewTimedLogger } from "../../../utils/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
	const logger = getNewTimedLogger();
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			const logAndWrite = (data: string) => {
				const text = logger(data);
				controller.enqueue(encoder.encode(`data: ${text}\n\n`));
				return text;
			};

			const finish = () => {
				controller.enqueue(encoder.encode("event: finish\ndata: \n\n"));
				controller.close();
			}

			(async () => {
				logAndWrite("Adding lock...");
				const lock = await client.setnx("lock", "1");
				if (!lock) {
					logAndWrite("Lock exists, aborting...");
					finish();
					return;
				}
				await client.expire("lock", 15);
				logAndWrite("Lock added.");

				logAndWrite("Fetching...");
				const data = await fetchAll(logAndWrite);
				logAndWrite("Fetched.");
				logAndWrite("Saving...");
				await client.set("data", JSON.stringify(data));
				logAndWrite("Saved.");
				logAndWrite("Removing lock...");
				await client.del("lock");
				logAndWrite("Lock removed.");
				finish();
			})();
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-store",
		},
	});
}