import type { ExportFile } from './services';

export type DeliverResult = 'shared' | 'downloaded' | 'cancelled';

/** Phones get the share sheet (Save to Files, AirDrop, ...); desktop browsers get a download. */
function preferShare(): boolean {
	try {
		return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
	} catch {
		return false;
	}
}

/**
 * Hands a generated file to the user. Anchor downloads are unreliable in an installed iOS web
 * app, so on touch devices the Web Share API comes first, with the download as the fallback.
 */
export async function deliverFile(file: ExportFile): Promise<DeliverResult> {
	const blobFile = new File([file.text], file.filename, { type: file.mime });
	if (
		preferShare() &&
		typeof navigator.canShare === 'function' &&
		navigator.canShare({ files: [blobFile] })
	) {
		try {
			await navigator.share({ files: [blobFile], title: file.filename });
			return 'shared';
		} catch (error) {
			if ((error as DOMException)?.name === 'AbortError') return 'cancelled';
			// Sharing failed for another reason: fall back to a download.
		}
	}
	const url = URL.createObjectURL(blobFile);
	const link = document.createElement('a');
	link.href = url;
	link.download = file.filename;
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
	return 'downloaded';
}
