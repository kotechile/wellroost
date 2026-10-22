/**
 * The text a "Copy scenario" action puts on the clipboard.
 *
 * Plain text, not JSON: these two packets are read by the person who just moved the sliders, who
 * wants to paste the answer into a message, a note or a contractor email. Remodelytics exports JSON
 * because its packet is handed to an underwriter; a homeowner's scenario is prose with numbers in it.
 *
 * The trailing line is deliberate. A copied packet outlives the page it came from, so it has to say
 * what it is — a scenario built from the visitor's own assumptions — without pretending to be an
 * appraisal or a quote.
 */
export interface ScenarioPacketSection {
	heading: string;
	rows: Array<[label: string, value: string]>;
}

export interface ScenarioPacket {
	/** Asset title, e.g. "5-Year Relocation Friction Ledger". */
	title: string;
	/** Human page path, printed so a pasted packet can be traced back. */
	sourcePath: string;
	/** One-line conclusion, printed first because that is what the visitor came for. */
	verdict: string;
	sections: ScenarioPacketSection[];
	/** Set by the caller so the timestamp is the visitor's own clock. */
	generatedAt?: Date;
}

export function formatScenarioPacket(packet: ScenarioPacket): string {
	const generatedAt = packet.generatedAt ?? new Date();
	const lines: string[] = [];

	lines.push(`${packet.title} — scenario packet`);
	lines.push(`WellRoost · wellroost.com${packet.sourcePath}`);
	lines.push('');
	lines.push(packet.verdict);
	lines.push('');

	for (const section of packet.sections) {
		lines.push(section.heading.toUpperCase());
		for (const [label, value] of section.rows) {
			lines.push(`  ${label}: ${value}`);
		}
		lines.push('');
	}

	lines.push(`Generated ${generatedAt.toISOString()}. Modelled from your own assumptions — not an appraisal, a quote, or a loan offer.`);

	return lines.join('\n');
}
