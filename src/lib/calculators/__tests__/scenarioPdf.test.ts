import { describe, expect, it } from 'vitest';
import { renderPacketHtml } from '../../scenarioPdf';
import { formatScenarioPacket, type ScenarioPacket } from '../../scenarioPacket';

/**
 * The print document is the artifact a visitor keeps, so its layout is asserted here rather than
 * eyeballed in a browser: a print dialog cannot be scripted, but the HTML that feeds it can.
 */
const packet: ScenarioPacket = {
	title: 'Recast vs refinance',
	sourcePath: '/calculators/recast-vs-refinance/',
	verdict: '$232.00 a month of permanent relief.',
	generatedAt: new Date('2026-10-25T02:00:00.000Z'),
	sections: [
		{
			heading: 'The loan',
			rows: [
				['Unpaid principal', '$375,173'],
				['Note rate', '3.25%']
			]
		},
		{
			heading: 'The recast',
			rows: [['Relief', '$232.00 a month']]
		}
	]
};

describe('renderPacketHtml', () => {
	it('renders every section heading and row', () => {
		const html = renderPacketHtml(packet);
		expect(html).toContain('<h2>The loan</h2>');
		expect(html).toContain('<h2>The recast</h2>');
		expect(html.match(/<tr>/g)?.length).toBe(3);
		expect(html).toContain('$375,173');
		expect(html).toContain('$232.00 a month');
	});

	it('leads with the verdict and names the source path', () => {
		const html = renderPacketHtml(packet);
		expect(html).toContain('class="wr-verdict"');
		expect(html.indexOf(packet.verdict)).toBeLessThan(html.indexOf('<h2>'));
		expect(html).toContain('/calculators/recast-vs-refinance/');
	});

	it('escapes operator-supplied labels instead of injecting them', () => {
		const html = renderPacketHtml({
			...packet,
			title: '<script>alert(1)</script>',
			sections: [{ heading: 'A & B', rows: [['x < y', '"quoted"']] }]
		});
		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;');
		expect(html).toContain('A &amp; B');
		expect(html).toContain('x &lt; y');
		expect(html).toContain('&quot;quoted&quot;');
	});

	it('carries the same disclaimer the copied packet carries', () => {
		const html = renderPacketHtml(packet);
		expect(html).toContain('not an appraisal, a quote, or a loan offer');
		expect(formatScenarioPacket(packet)).toContain('not an appraisal, a quote, or a loan offer');
	});

	it('stamps the generation date in both exports', () => {
		expect(renderPacketHtml(packet)).toContain('2026-10-25');
		expect(formatScenarioPacket(packet)).toContain('2026-10-25T02:00:00.000Z');
	});
});
