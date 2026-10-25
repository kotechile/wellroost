import { describe, expect, it } from 'vitest';
import { trafficEntry } from '../telemetry';

/**
 * `entry` decides whether the report counts an audience or a distribution. Getting it wrong is
 * silent — every view still arrives, just under the wrong column — so the three cases are pinned
 * here rather than checked by eye in production a month later.
 */
describe('trafficEntry', () => {
	it('reads a scenario link from the state parameter', () => {
		expect(trafficEntry('?state=abc123', '', 'wellroost.com')).toBe('state');
	});

	it('calls an off-site referrer a referral', () => {
		expect(trafficEntry('', 'https://www.reddit.com/r/RealEstate/', 'wellroost.com')).toBe('referral');
		expect(trafficEntry('', 'https://www.google.com/', 'wellroost.com')).toBe('referral');
	});

	it('does not call internal navigation a referral', () => {
		expect(trafficEntry('', 'https://wellroost.com/articles/some-post/', 'wellroost.com')).toBe('direct');
	});

	it('treats an empty or unparseable referrer as direct', () => {
		expect(trafficEntry('', '', 'wellroost.com')).toBe('direct');
		expect(trafficEntry('', 'not a url', 'wellroost.com')).toBe('direct');
	});

	it('prefers state over referrer: a cited link opened from Google is still a citation', () => {
		expect(trafficEntry('?state=xyz', 'https://www.google.com/', 'wellroost.com')).toBe('state');
	});

	it('ignores an unrelated query string', () => {
		expect(trafficEntry('?utm_source=reddit', '', 'wellroost.com')).toBe('direct');
	});
});
