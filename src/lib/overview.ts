import { readFile } from 'node:fs/promises';

import { resolveOverviewPath } from './source-files';

export interface AudienceSegment {
	title: string;
	description: string;
}

export interface OverviewContent {
	eyebrow: string;
	headline: string;
	subheadline: string;
	mission: string;
	originStory: string;
	audience: AudienceSegment[];
	aboutSections: Array<{ title: string; body: string }>;
}

const FALLBACK_OVERVIEW: OverviewContent = {
	eyebrow: 'The Decision Engine for Your Home',
	headline: 'Stop guessing. Start calculating.',
	subheadline:
		'WellRoost connects home renovation ROI, energy optimization, and financial analytics so homeowners make objective, high-ROI property choices.',
	mission:
		'Create practical data tools and insights for homeowners and buyers making expensive property, remodeling, and lifestyle choices.',
	originStory:
		'WellRoost was created to eliminate guesswork from homeownership. Instead of relying on contractor sales pitches or unverified opinions, we provide transparent financial models and decision engines.',
	audience: [
		{
			title: 'Homeowners',
			description: 'Planning renovations and looking to maximize equity growth and comfort.'
		},
		{
			title: 'Move vs. Improve Evaluators',
			description: 'Comparing the 5-year financial impact of renovating versus selling and relocating.'
		},
		{
			title: 'System Builders',
			description: 'Optimizing residential energy, smart home systems, and preventive maintenance.'
		}
	],
	aboutSections: [
		{
			title: 'What WellRoost Covers',
			body: 'Remodeling ROI, energy optimization, move vs. improve tradeoffs, and residential property finances.'
		}
	]
};

let overviewCache: Promise<OverviewContent> | undefined;

function cleanTextBlock(value: string) {
	return value.replace(/\s+/g, ' ').trim();
}

async function loadOverview() {
	const overviewPath = resolveOverviewPath();
	if (!overviewPath) {
		return FALLBACK_OVERVIEW;
	}

	try {
		const rawContent = await readFile(overviewPath, 'utf8');
		const cleanedContent = rawContent.replace(/\r/g, '');

		return {
			...FALLBACK_OVERVIEW,
			originStory: cleanTextBlock(cleanedContent)
		};
	} catch {
		return FALLBACK_OVERVIEW;
	}
}

export async function getOverviewContent() {
	overviewCache ??= loadOverview();
	return overviewCache;
}
