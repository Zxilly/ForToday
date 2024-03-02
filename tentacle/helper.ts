import { Problem, UserProblemStatus } from "../types/tentacle";

export class ProblemHelper {
	private cnt = 0;
	private id2result: Record<string, boolean> = {};
	private id2problem: Record<string, Problem> = {};

	add_problem(id: string, result: boolean, object: Problem) {
		this.cnt++;
		this.id2result[id] ||= result;
		this.id2problem[id] ||= object;
	}

	get_status() {
		const passProblems: Problem[] = [],
			failedProblems: Problem[] = [];
		for (const item of Object.entries(this.id2result))
			(item[1] ? passProblems : failedProblems).push(
				this.id2problem[item[0]],
			);
		return new UserProblemStatus(passProblems, failedProblems, this.cnt);
	}
}
