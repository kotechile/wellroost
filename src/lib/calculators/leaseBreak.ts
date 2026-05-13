import type { LeaseBreakBreakdown, LeaseBreakInputs } from './types';

function sanitizeCurrency(value: number) {
	return Number.isFinite(value) && value > 0 ? value : 0;
}

function sanitizeWholeNumber(value: number) {
	return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function sanitizePercent(value: number) {
	return Number.isFinite(value) && value > 0 ? value : 0;
}

export function calculateLeaseBreakPenalty(inputs: LeaseBreakInputs): LeaseBreakBreakdown {
	const monthlyRent = sanitizeCurrency(inputs.monthlyRent);
	const remainingMonths = sanitizeWholeNumber(inputs.remainingMonths);
	const fixedFee = sanitizeCurrency(inputs.fixedFee);
	const percentageFee = sanitizePercent(inputs.percentageFee);
	const monthsFee = sanitizeWholeNumber(inputs.monthsFee);
	const additionalCosts = sanitizeCurrency(inputs.additionalCosts);
	const securityDeposit = sanitizeCurrency(inputs.securityDeposit);

	const fixedPenalty = fixedFee;
	const percentagePenalty = (percentageFee / 100) * monthlyRent * remainingMonths;
	const monthsPenalty = monthsFee * monthlyRent;
	const basePenalty = Math.max(fixedPenalty, percentagePenalty, monthsPenalty);

	const selectedMethodPenalty =
		inputs.selectedMethod === 'fixed'
			? fixedPenalty
			: inputs.selectedMethod === 'percentage'
				? percentagePenalty
				: monthsPenalty;

	return {
		fixedPenalty,
		percentagePenalty,
		monthsPenalty,
		selectedMethodPenalty,
		basePenalty,
		additionalCosts,
		securityDepositOffset: securityDeposit,
		netPenalty: Math.max(basePenalty + additionalCosts - securityDeposit, 0)
	};
}
