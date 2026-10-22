/**
 * Copy text to the clipboard, and tell the truth about whether it worked.
 *
 * `navigator.clipboard` is absent on an insecure origin and rejects when the permission is denied —
 * notably inside some embedded webviews and when the document is not focused. An engine's export
 * action must not depend on that succeeding: the completion event, the label and the visitor's
 * numbers all have to survive a blocked write.
 *
 * The `execCommand` path is deprecated but it is the only thing that works outside a secure context,
 * and a calculator served over plain http is exactly where a visitor would otherwise get no feedback
 * at all. It is a fallback, never the primary path.
 *
 * Returns `true` only when a copy actually happened, so callers never render "Copied" for a blocked
 * write.
 */
export async function copyText(text: string): Promise<boolean> {
	if (typeof document === 'undefined') return false;

	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch (error) {
		console.warn('[WellRoost] clipboard API blocked, trying the legacy path:', error);
	}

	try {
		const area = document.createElement('textarea');
		area.value = text;
		area.setAttribute('readonly', '');
		// Off-screen rather than hidden: a `display:none` element cannot be selected.
		area.style.position = 'fixed';
		area.style.top = '-1000px';
		area.style.opacity = '0';
		document.body.appendChild(area);
		area.select();
		const ok = document.execCommand('copy');
		document.body.removeChild(area);
		return ok;
	} catch (error) {
		console.warn('[WellRoost] clipboard write failed:', error);
		return false;
	}
}
