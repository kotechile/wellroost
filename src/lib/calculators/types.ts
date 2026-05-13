export type LeasePenaltyMethod = 'fixed' | 'percentage' | 'months';

export interface LeaseBreakInputs {
	monthlyRent: number;
	remainingMonths: number;
	selectedMethod: LeasePenaltyMethod;
	fixedFee: number;
	percentageFee: number;
	monthsFee: number;
	additionalCosts: number;
	securityDeposit: number;
}

export interface LeaseBreakBreakdown {
	fixedPenalty: number;
	percentagePenalty: number;
	monthsPenalty: number;
	selectedMethodPenalty: number;
	basePenalty: number;
	additionalCosts: number;
	securityDepositOffset: number;
	netPenalty: number;
}
