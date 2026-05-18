import type { RemodelyticsInputs } from '../calculators/types';
import type { RemodelyticsFetchedContext, RemodelyticsOverrides } from './types';

export function mergeRemodelyticsInputs(
	base: RemodelyticsInputs,
	context: RemodelyticsFetchedContext | null,
	overrides: RemodelyticsOverrides
): RemodelyticsInputs {
	return {
		...base,
		zipCode: context?.property?.zipCode?.value ?? base.zipCode,
		homeSize: context?.property?.homeSize?.value ?? base.homeSize,
		homeValue:
			context?.valuation?.avmValue?.value ??
			context?.property?.currentValue?.value ??
			base.homeValue,
		currentValue:
			context?.property?.currentValue?.value ??
			context?.valuation?.avmValue?.value ??
			base.currentValue,
		compAverageValue: context?.valuation?.compAverageValue?.value ?? base.compAverageValue,
		...overrides
	};
}
