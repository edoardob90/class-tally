export interface MergePlan<T> {
	/** Incoming records that do not exist locally. */
	insert: T[];
	/** Incoming records that are newer than the local ones and replace them. */
	replace: T[];
	/** Local records that stay (incoming is older or has the same `updatedAt`). */
	keep: T[];
}

/** Last-write-wins by `updatedAt`, matched by id. A tie keeps the local record. */
export function planMerge<T extends { id: string; updatedAt: string }>(
	local: readonly T[],
	incoming: readonly T[]
): MergePlan<T> {
	const byId = new Map(local.map((r) => [r.id, r]));
	const plan: MergePlan<T> = { insert: [], replace: [], keep: [] };
	for (const rec of incoming) {
		const mine = byId.get(rec.id);
		if (!mine) plan.insert.push(rec);
		else if (Date.parse(rec.updatedAt) > Date.parse(mine.updatedAt)) plan.replace.push(rec);
		else plan.keep.push(mine);
	}
	return plan;
}
