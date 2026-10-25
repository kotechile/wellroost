/**
 * "Save as PDF" for a decision engine — the paper/PDF half of the export surface.
 *
 * A pure-PHP-style PDF writer is not worth a 300 KB dependency on a page whose whole pitch is page
 * weight and arithmetic you can audit. Every browser's print dialog carries a "Save as PDF"
 * destination, so the button renders the SAME scenario packet the copy action puts on the
 * clipboard into a print-only document and opens that dialog.
 *
 * Two rules this module exists to keep:
 *
 * 1. **One source of truth for the exported document.** The packet object built by the engine feeds
 *    both exports (`formatScenarioPacket` → clipboard, `renderPacketHtml` → print), so the PDF a
 *    visitor saves and the text they paste can never say different things.
 * 2. **Never claim a save that did not happen.** `window.print()` resolves when the dialog OPENS;
 *    whether the visitor completed the save is unknowable from the page. The label therefore reads
 *    "Print dialog opened", not "Saved".
 *
 * The injected node is print-scoped: `html.wr-printing` hides every other body child, so the packet
 * prints on its own instead of the calculator chrome, inputs and navigation. It is removed on
 * `afterprint` (and defensively on the next call), so nothing leaks into subsequent prints.
 */
import type { ScenarioPacket } from './scenarioPacket';

const NODE_ID = 'wr-packet-print';
const STYLE_ID = 'wr-packet-print-style';
const PRINTING_CLASS = 'wr-printing';

/**
 * Print-only CSS. Deliberately not Tailwind: this node is appended outside the app's layout and has
 * to survive whatever utility classes the surrounding page carries. Black on white, because a
 * visitor printing a dark result band should not spend a cartridge doing it.
 */
const PRINT_CSS = `
#${NODE_ID} { display: none; }
@media print {
  html.${PRINTING_CLASS} body > *:not(#${NODE_ID}) { display: none !important; }
  html.${PRINTING_CLASS} #${NODE_ID} { display: block !important; }
  html.${PRINTING_CLASS} body { background: #fff !important; margin: 0 !important; }
  #${NODE_ID} {
    color: #111;
    background: #fff;
    font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.45;
    padding: 0;
  }
  #${NODE_ID} .wr-eyebrow {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1.5pt solid #111;
    padding-bottom: 4pt;
    font-size: 8pt;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  #${NODE_ID} h1 { font-size: 19pt; line-height: 1.2; margin: 14pt 0 0; letter-spacing: -0.01em; }
  #${NODE_ID} .wr-verdict {
    font-size: 12pt;
    line-height: 1.4;
    margin: 10pt 0 0;
    padding: 9pt 11pt;
    border-left: 3pt solid #111;
    background: #f4f4f4;
  }
  #${NODE_ID} h2 {
    font-size: 8pt;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    margin: 16pt 0 5pt;
    padding-bottom: 3pt;
    border-bottom: 0.5pt solid #bbb;
  }
  #${NODE_ID} table { width: 100%; border-collapse: collapse; }
  #${NODE_ID} th, #${NODE_ID} td { text-align: left; vertical-align: top; padding: 3.5pt 0; }
  #${NODE_ID} td.wr-value {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    white-space: nowrap;
    padding-left: 14pt;
  }
  #${NODE_ID} tr + tr td { border-top: 0.5pt solid #e2e2e2; }
  #${NODE_ID} .wr-foot {
    margin-top: 18pt;
    padding-top: 6pt;
    border-top: 0.5pt solid #bbb;
    font-size: 8pt;
    color: #444;
  }
  #${NODE_ID} .wr-foot p { margin: 0 0 3pt; }
}
`;

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * The printable document for a packet. Pure string in, pure string out — so the layout can be
 * asserted in a test without a browser, print dialog or PDF reader.
 */
export function renderPacketHtml(packet: ScenarioPacket): string {
	const generatedAt = packet.generatedAt ?? new Date();
	const stamp = generatedAt.toISOString().slice(0, 10);

	const sections = packet.sections
		.map((section) => {
			const rows = section.rows
				.map(
					([label, value]) =>
						`<tr><td>${escapeHtml(label)}</td><td class="wr-value">${escapeHtml(value)}</td></tr>`
				)
				.join('');
			return `<h2>${escapeHtml(section.heading)}</h2><table>${rows}</table>`;
		})
		.join('');

	return [
		`<div class="wr-eyebrow"><span>WellRoost · scenario packet</span><span>${stamp}</span></div>`,
		`<h1>${escapeHtml(packet.title)}</h1>`,
		`<p class="wr-verdict">${escapeHtml(packet.verdict)}</p>`,
		sections,
		'<div class="wr-foot">',
		`<p>Generated ${escapeHtml(generatedAt.toISOString())} at wellroost.com${escapeHtml(packet.sourcePath)}</p>`,
		'<p>Modelled from your own assumptions — not an appraisal, a quote, or a loan offer. Re-run the calculator if the figures change.</p>',
		'</div>'
	].join('');
}

function ensureStyle(): void {
	if (document.getElementById(STYLE_ID)) return;
	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = PRINT_CSS;
	document.head.appendChild(style);
}

function cleanup(): void {
	document.documentElement.classList.remove(PRINTING_CLASS);
	document.getElementById(NODE_ID)?.remove();
}

/**
 * Render the packet into a print-only node and open the browser's print dialog.
 *
 * Returns `true` when the dialog was opened. Callers must not label that as a completed save.
 */
export function saveScenarioPacketAsPdf(packet: ScenarioPacket): boolean {
	if (typeof document === 'undefined' || typeof window === 'undefined' || !window.print) return false;

	cleanup();
	ensureStyle();

	const node = document.createElement('div');
	node.id = NODE_ID;
	node.innerHTML = renderPacketHtml(packet);
	document.body.appendChild(node);

	// The document title seeds the PDF filename in most browsers, so it carries the engine name
	// rather than the site name.
	const previousTitle = document.title;
	document.title = `WellRoost — ${packet.title}`;

	const restore = () => {
		window.removeEventListener('afterprint', restore);
		document.title = previousTitle;
		cleanup();
	};
	window.addEventListener('afterprint', restore);

	document.documentElement.classList.add(PRINTING_CLASS);

	try {
		window.print();
	} catch (error) {
		console.warn('[WellRoost] print dialog unavailable:', error);
		restore();
		return false;
	}

	// Safari fires no `afterprint` on some versions; drop the flag once the dialog has had its turn
	// so the page is never left in a state where the next print of the site is blank.
	window.setTimeout(() => {
		if (document.documentElement.classList.contains(PRINTING_CLASS)) restore();
	}, 60_000);

	return true;
}
