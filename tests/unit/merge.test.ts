import { describe, expect, it } from 'vitest';
import { planMerge } from '../../src/lib/domain';

const r = (id: string, updatedAt: string, v = '') => ({ id, updatedAt, v });

describe('planMerge', () => {
	it('inserts unknown records, replaces older ones, keeps newer or equal local ones', () => {
		const local = [
			r('a', '2026-01-02T00:00:00.000Z', 'local'),
			r('b', '2026-01-02T00:00:00.000Z', 'local'),
			r('c', '2026-01-02T00:00:00.000Z', 'local')
		];
		const incoming = [
			r('a', '2026-01-03T00:00:00.000Z', 'incoming'), // newer
			r('b', '2026-01-01T00:00:00.000Z', 'incoming'), // older
			r('c', '2026-01-02T00:00:00.000Z', 'incoming'), // tie
			r('d', '2026-01-01T00:00:00.000Z', 'incoming') // new
		];
		const plan = planMerge(local, incoming);
		expect(plan.replace.map((x) => x.id)).toEqual(['a']);
		expect(plan.insert.map((x) => x.id)).toEqual(['d']);
		expect(plan.keep.map((x) => [x.id, x.v])).toEqual([
			['b', 'local'],
			['c', 'local']
		]);
	});
});
