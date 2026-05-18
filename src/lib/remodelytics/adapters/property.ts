import type { PropertyLookupRequest, PropertyLookupResult } from '../types';

function hashAddress(input: string) {
	let hash = 0;

	for (let index = 0; index < input.length; index += 1) {
		hash = (hash << 5) - hash + input.charCodeAt(index);
		hash |= 0;
	}

	return Math.abs(hash);
}

function extractZip(address: string) {
	const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
	return match?.[1] ?? '33139';
}

function titleCaseAddress(address: string) {
	return address
		.trim()
		.split(/\s+/)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

export async function fetchPropertyContext(
	request: PropertyLookupRequest
): Promise<PropertyLookupResult> {
	const normalizedAddress = titleCaseAddress(request.address);

	if (!normalizedAddress) {
		throw new Error('Address is required for property lookup.');
	}

	const hash = hashAddress(normalizedAddress);
	const zipCode = extractZip(normalizedAddress);
	const currentValue = 425000 + (hash % 575000);
	const homeSize = 1200 + (hash % 2400);
	const yearBuilt = 1955 + (hash % 65);
	const bedrooms = 2 + (hash % 4);
	const bathrooms = 1 + ((hash >> 1) % 3);
	const updatedAt = new Date().toISOString();

	return {
		property: {
			address: {
				value: normalizedAddress,
				source: {
					kind: 'fallback',
					label: 'Local property lookup fallback',
					confidence: 'medium',
					lastUpdated: updatedAt
				}
			},
			zipCode: {
				value: zipCode,
				source: {
					kind: 'fallback',
					label: 'Local property lookup fallback',
					confidence: 'medium',
					lastUpdated: updatedAt
				}
			},
			homeSize: {
				value: homeSize,
				source: {
					kind: 'fallback',
					label: 'Local property lookup fallback',
					confidence: 'low',
					lastUpdated: updatedAt
				}
			},
			yearBuilt: {
				value: yearBuilt,
				source: {
					kind: 'fallback',
					label: 'Local property lookup fallback',
					confidence: 'low',
					lastUpdated: updatedAt
				}
			},
			bedrooms: {
				value: bedrooms,
				source: {
					kind: 'fallback',
					label: 'Local property lookup fallback',
					confidence: 'low',
					lastUpdated: updatedAt
				}
			},
			bathrooms: {
				value: bathrooms,
				source: {
					kind: 'fallback',
					label: 'Local property lookup fallback',
					confidence: 'low',
					lastUpdated: updatedAt
				}
			},
			currentValue: {
				value: currentValue,
				source: {
					kind: 'fallback',
					label: 'Local property lookup fallback',
					confidence: 'medium',
					lastUpdated: updatedAt
				}
			}
		}
	};
}
