export const calculatorTools = [
	{
		title: 'Move or Improve Calculator',
		slug: 'move-or-improve',
		href: '/calculators/move-or-improve/',
		status: 'Live',
		accent: 'emerald',
		description:
			'Compare the 5-year financial projection of renovating your current home versus selling and relocating.',
		utility: 'Choose between home renovation and relocation',
		category: 'FinanceApplication',
		keywords: ['move or improve calculator', 'renovate vs relocate', 'remodel vs sell calculator']
	},
	{
		title: 'Remodeling ROI Calculator',
		slug: 'remodeling-roi',
		href: '/calculators/remodeling-roi/',
		status: 'Live',
		accent: 'cyan',
		description:
			'Pressure-test a home upgrade with project cost, resale lift, stay horizon, enjoyment value, and monthly savings.',
		utility: 'Decide if a project is worth it',
		category: 'FinanceApplication',
		keywords: ['remodeling ROI calculator', 'home improvement ROI', 'renovation calculator']
	},
	{
		title: 'Remodelytics',
		slug: 'remodelytics',
		href: '/calculators/remodelytics/',
		status: 'Live',
		accent: 'blue',
		description:
			'Model remodel ROI, ARV, energy incentives, ADU income, leverage, and over-improvement risk in one platform.',
		utility: 'Run advanced remodel math',
		category: 'BusinessApplication',
		keywords: ['Remodelytics', 'home upgrade ROI calculator', 'ARV calculator', 'renovation underwriting']
	}
] as const;

export type CalculatorTool = (typeof calculatorTools)[number];

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

export function getCalculatorBySlug(slug: CalculatorTool['slug']) {
	return calculatorTools.find((tool) => tool.slug === slug);
}
