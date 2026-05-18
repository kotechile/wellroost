import type {
	ValuationLookupRequest,
	ValuationLookupResult
} from '../types';
import type { RemodelyticsProjectType } from '../../calculators/types';

const PROJECT_LIFT: Record<RemodelyticsProjectType, number> = {
	kitchen: 0.14,
	bathroom: 0.1,
	siding: 0.08,
	deck: 0.06,
	'garage-door': 0.04,
	hvac: 0.05,
	solar: 0.07,
	adu: 0.22,
	'basement-rental': 0.16
};

function hashAddress(input: string) {
	let hash = 7;

	for (let index = 0; index < input.length; index += 1) {
		hash = hash * 31 + input.charCodeAt(index);
	}

	return Math.abs(hash);
}

export async function fetchValuationContext(
	request: ValuationLookupRequest
): Promise<ValuationLookupResult> {
	if (!request.address.trim()) {
		throw new Error('Address is required for valuation lookup.');
	}

	const hash = hashAddress(request.address.trim());
	const baseValue = request.currentValue ?? 425000 + (hash % 575000);
	const projectLift = PROJECT_LIFT[request.projectType] ?? 0.1;
	const avmValue = Math.round(baseValue / 1000) * 1000;
	const compAverageValue = Math.round(baseValue * (1 + projectLift) / 1000) * 1000;
	const neighborhoodCeilingValue = Math.round(baseValue * (1.08 + (hash % 7) * 0.01) / 1000) * 1000;
	const compCount = 3 + (hash % 5);
	const updatedAt = new Date().toISOString();

	return {
		valuation: {
			avmValue: {
				value: avmValue,
				source: {
					kind: 'fallback',
					label: 'Local valuation fallback',
					confidence: 'medium',
					lastUpdated: updatedAt
				}
			},
			compAverageValue: {
				value: Math.min(compAverageValue, neighborhoodCeilingValue),
				source: {
					kind: 'fallback',
					label: 'Local comp-average fallback',
					confidence: 'medium',
					lastUpdated: updatedAt
				}
			},
			neighborhoodCeilingValue: {
				value: neighborhoodCeilingValue,
				source: {
					kind: 'fallback',
					label: 'Local neighborhood ceiling fallback',
					confidence: 'low',
					lastUpdated: updatedAt
				}
			},
			compCount: {
				value: compCount,
				source: {
					kind: 'fallback',
					label: 'Local comp-count fallback',
					confidence: 'low',
					lastUpdated: updatedAt
				}
			}
		}
	};
}
