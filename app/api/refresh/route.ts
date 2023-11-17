import { fetchAll } from "../../../tentacle";
import { getNewTimedLogger } from "../../../utils/utils";
import { acquireDataLock, releaseDataLock, writeData } from "../../../utils/repo";

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
				await acquireDataLock(logAndWrite);
				logAndWrite("Lock added.");

				logAndWrite("Fetching...");
				const data = await fetchAll(logAndWrite);
				logAndWrite("Fetched.");
				logAndWrite("Saving...");
				await writeData(data as any);
				logAndWrite("Saved.");
				logAndWrite("Removing lock...");
				await releaseDataLock(logAndWrite);
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