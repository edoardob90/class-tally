// Renders the app icons (PNG) from an inline SVG with the Chromium that Playwright already uses.
// Run once after changing the design: `node scripts/generate-icons.mjs`
// In a sandbox with its own browser, set PW_CHROMIUM_PATH to its executable.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const BLUE = '#1d4ed8';

/** Four tally strokes crossed by a fifth. `scale` shrinks the drawing towards the centre. */
function tally(scale) {
	const marks = [140, 205, 270, 335]
		.map((x) => `<line x1="${x}" y1="135" x2="${x}" y2="377"/>`)
		.join('');
	const slash = '<line x1="95" y1="330" x2="380" y2="180"/>';
	return `<g transform="translate(256 256) scale(${scale}) translate(-256 -256)" stroke="#fff" stroke-width="34" stroke-linecap="round" fill="none">${marks}${slash}</g>`;
}

/** `size` null gives a scalable SVG (the favicon). */
const svg = (size, { rounded, scale }) =>
	`<svg xmlns="http://www.w3.org/2000/svg"${size ? ` width="${size}" height="${size}"` : ''} viewBox="0 0 512 512">` +
	`<rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="${BLUE}"/>${tally(scale)}</svg>`;

const outputs = [
	{ file: 'static/icons/icon-192.png', size: 192, rounded: true, scale: 1, transparent: true },
	{ file: 'static/icons/icon-512.png', size: 512, rounded: true, scale: 1, transparent: true },
	// Full-bleed with the drawing inside the central 80 % "safe zone".
	{ file: 'static/icons/icon-maskable-512.png', size: 512, rounded: false, scale: 0.7 },
	// iOS rounds the corners itself; the image must be opaque.
	{ file: 'static/icons/apple-touch-icon.png', size: 180, rounded: false, scale: 0.85 }
];

mkdirSync('static/icons', { recursive: true });
writeFileSync('static/favicon.svg', svg(null, { rounded: true, scale: 1 }));

const browser = await chromium.launch({
	executablePath: process.env.PW_CHROMIUM_PATH || undefined
});
for (const out of outputs) {
	const page = await browser.newPage({ viewport: { width: out.size, height: out.size } });
	await page.setContent(
		`<style>html,body{margin:0;background:transparent}</style>${svg(out.size, out)}`
	);
	await page.screenshot({ path: out.file, omitBackground: !!out.transparent });
	await page.close();
	console.log('wrote', out.file);
}
await browser.close();
