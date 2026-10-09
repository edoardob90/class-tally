import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'svelte/compiler';

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
	'node_modules',
	'.git',
	'.svelte-kit',
	'build',
	'test-results',
	'playwright-report'
]);

function walk(dir: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		if (SKIP_DIRS.has(name)) continue;
		const p = join(dir, name);
		if (statSync(p).isDirectory()) walk(p, out);
		else out.push(p);
	}
	return out;
}

const TEXT_EXT = /\.(md|ts|js|svelte|json|html|css|yml|yaml|svg|webmanifest|txt|sh|mjs)$/;
const allFiles = walk(ROOT).filter((f) => TEXT_EXT.test(f) && !f.endsWith('package-lock.json'));
const rel = (f: string) => relative(ROOT, f);

describe('no em dash anywhere', () => {
	const EM_DASH = String.fromCharCode(0x2014);
	it('keeps code, docs, fixtures and workflows free of the em dash character', () => {
		const offenders = allFiles.filter((f) => readFileSync(f, 'utf8').includes(EM_DASH)).map(rel);
		expect(offenders).toEqual([]);
	});
});

describe('no external URLs in source', () => {
	it('contains no http(s) URLs other than comments and XML namespaces', () => {
		const offenders: string[] = [];
		const roots = ['src', 'static'].map((d) => join(ROOT, d));
		for (const f of allFiles.filter((f) => roots.some((r) => f.startsWith(r)))) {
			readFileSync(f, 'utf8')
				.split('\n')
				.forEach((line, i) => {
					if (!/https?:\/\//.test(line)) return;
					const stripped = line.replace(/https?:\/\/www\.w3\.org\/[^\s"']*/g, '');
					if (!/https?:\/\//.test(stripped)) return;
					if (/^\s*(\/\/|\*|\/\*|<!--)/.test(line)) return;
					offenders.push(`${rel(f)}:${i + 1}`);
				});
		}
		expect(offenders).toEqual([]);
	});
});

// ---------------------------------------------------------------------------------------------
// Hard-coded user-facing text in .svelte files
// ---------------------------------------------------------------------------------------------

const TEXT_ATTRIBUTES = new Set(['aria-label', 'aria-description', 'title', 'placeholder', 'alt']);
const HAS_LETTER = /\p{L}/u;

interface Node {
	type: string;
	[key: string]: unknown;
}

/** Finds literal text with letters in the template and in text-bearing attributes. */
export function findHardCodedText(source: string): string[] {
	const ast = parse(source, { modern: true }) as unknown as { fragment: Node };
	const found: string[] = [];
	const visit = (node: unknown): void => {
		if (Array.isArray(node)) return node.forEach(visit);
		if (typeof node !== 'object' || node === null) return;
		const n = node as Node;
		if (n.type === 'Text' && typeof n.data === 'string' && HAS_LETTER.test(n.data)) {
			found.push(`text "${n.data.trim()}"`);
		}
		if (n.type === 'Attribute' && typeof n.name === 'string' && TEXT_ATTRIBUTES.has(n.name)) {
			const value = n.value;
			const parts = Array.isArray(value) ? value : [value];
			for (const p of parts) {
				const part = p as Node | true;
				if (part !== true && part?.type === 'Text' && HAS_LETTER.test(String(part.data))) {
					found.push(`${n.name}="${String(part.data)}"`);
				}
			}
		}
		for (const [key, child] of Object.entries(n)) {
			if (key === 'type' || key === 'start' || key === 'end') continue;
			// Attribute text was handled above; only look inside {expressions} of attribute values.
			if (n.type === 'Attribute' && key === 'value') {
				const parts = Array.isArray(child) ? child : [child];
				parts.filter((p) => (p as Node)?.type !== 'Text').forEach(visit);
				continue;
			}
			visit(child);
		}
	};
	visit(ast.fragment);
	return found;
}

describe('no hard-coded text in components', () => {
	it('detects literal text and text attributes (self-test)', () => {
		expect(findHardCodedText('<p>Hello</p>')).toHaveLength(1);
		expect(findHardCodedText('<button aria-label="Close">{x}</button>')).toHaveLength(1);
		expect(findHardCodedText('<input placeholder="Name" />')).toHaveLength(1);
		expect(findHardCodedText('<svelte:head><title>Home</title></svelte:head>')).toHaveLength(1);
		expect(findHardCodedText('<p>{t("a.b")}</p><span>/</span><b>1</b>')).toHaveLength(0);
		expect(
			findHardCodedText('<button aria-label={t("a")} class="px-2">&times;</button>')
		).toHaveLength(0);
	});

	it('finds none in src/**/*.svelte', () => {
		const offenders: string[] = [];
		for (const f of allFiles.filter((f) => f.endsWith('.svelte'))) {
			for (const hit of findHardCodedText(readFileSync(f, 'utf8')))
				offenders.push(`${rel(f)}: ${hit}`);
		}
		expect(offenders).toEqual([]);
	});
});
