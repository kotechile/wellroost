/**
 * The calculator list, derived. Nothing here is a second copy of anything.
 *
 * This module used to *be* the list, with a second pairing of indices to asset keys living inside
 * `/calculators/index.astro`. Now `registry.ts` holds the tool-and-asset pairing and this is a view
 * over it, kept because four pages and the JSON-LD helper already import from here. Two lists of
 * engines is one list too many.
 */
import { engineBySlug, engineRegistry, type EngineRecord } from './registry';

export interface CalculatorTool {
	title: string;
	slug: string;
	href: string;
	status: EngineRecord['status'];
	description: string;
	utility: string;
	category: EngineRecord['applicationCategory'];
	keywords: readonly string[];
}

export const calculatorTools: CalculatorTool[] = engineRegistry.map((engine) => ({
	title: engine.title,
	slug: engine.toolSlug,
	href: engine.asset.href,
	status: engine.status,
	description: engine.description,
	utility: engine.utility,
	category: engine.applicationCategory,
	keywords: engine.keywords
}));

export type CalculatorSlug = (typeof calculatorTools)[number]['slug'];

export function getCalculatorSchema(tool: CalculatorTool, site: URL) {
	const url = new URL(tool.href, site).toString();

	return {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: tool.title,
		description: tool.description,
		url,
		applicationCategory: tool.category,
		operatingSystem: 'Web',
		isAccessibleForFree: true,
		keywords: tool.keywords.join(', '),
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD',
			url
		},
		publisher: {
			'@type': 'Organization',
			name: 'WellRoost',
			url: new URL('/', site).toString()
		}
	};
}

export function getCalculatorBySlug(slug: string) {
	return calculatorTools.find((tool) => tool.slug === slug);
}

export { engineBySlug };
