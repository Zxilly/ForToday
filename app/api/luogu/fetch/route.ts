import { ProblemHelper } from "../../../../tentacle/helper";
import { isValidDate } from "../../../../utils/utils";
import { LuoguRPCRequest } from "../../../../types/luogu";
import { luoguFetch } from "../../../../utils/luogu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	const data: LuoguRPCRequest = await request.json();

	const { uid, client_id, account } = data;

	if (!uid || !client_id || !account) {
		return Response.json({ message: "Invalid Request" }, { status: 400 });
	}

	let earliest_submission_time = new Date().getTime();

	const helper = new ProblemHelper();
	for (let i = 1; ; i++) {
		const resp = await luoguFetch(
			`https://www.luogu.com.cn/record/list?user=${account}&page=${i}&_contentOnly=1`,
			uid,
			client_id,
		);

		const data = resp.data;
		if (data.currentTemplate !== "RecordList") {
			return Response.json({ message: "Invalid Token" }, { status: 400 });
		}

		for (const record of data.currentData.records.result) {
			const time = record.submitTime;
			earliest_submission_time = Math.min(
				earliest_submission_time,
				time * 1000,
			);
			if (!isValidDate(new Date(time * 1000))) {
				break;
			}

			const id = `luogu-${record.problem.pid}`;
			helper.add_problem(id, record.status === 12, {
				id,
				platform: "luogu",
				contest: record.contest?.name ?? "",
				title: `${record.problem.pid} ${record.problem.title}`,
				problemUrl: `https://www.luogu.com.cn/problem/${record.problem.pid}`,
			});
		}

		if (data.currentData.records.count < 20) {
			break;
		}
		if (!isValidDate(new Date(earliest_submission_time))) {
			break;
		}
	}
	return Response.json(helper.get_status());
}
