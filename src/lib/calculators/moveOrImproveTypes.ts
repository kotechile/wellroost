export interface LegacyDebtInputs {
  principalBalance: number;
  interestRate: number; // annual rate, e.g. 0.035
  remainingTermMonths: number;
}

export interface MovingFrictionInputs {
  zipCode: string;
  brokerCommissionRate: number; // e.g. 0.06
  buyerClosingCostRate: number; // e.g. 0.03
  movingExpenses: number;
  isFirstTimeBuyer: boolean;
}

export interface RenovationInputs {
  projectType: string;
  quoteAmount: number;
  overrunRate: number; // e.g. 0.10 for 10%
  addBedBath: boolean;
  isSecondStory: boolean;
  isAddition: boolean;
  currentSqft: number;
  addedSqft: number;
}

export interface MoveOrImproveInputs {
  currentValue: number; // V_0
  annualAppreciation: number; // alpha, e.g. 0.03
  newPropertyPrice: number; // P_new
  newMortgageRate: number; // e.g. 0.065
  newMortgageTermMonths: number; // e.g. 360
  legacyDebt: LegacyDebtInputs;
  friction: MovingFrictionInputs;
  renovation: RenovationInputs;
}

export interface LedgerYearRow {
  grossValue: number;
  outstandingDebt: number;
  netEquity: number;
  cumulativePayments: number;
  yearlySpent: number;
}

export interface MoveOrImproveBreakdown {
  initialBaseline: {
    propertyValue: number;
    debt: number;
    equity: number;
  };
  improvePathway: LedgerYearRow[]; // Year 0 to 5
  movePathway: LedgerYearRow[];    // Year 0 to 5
  variance: {
    year5EquityVariance: number; // improve - move
    year5PaymentVariance: number;
    fiveYearTotalImprove: number;
    fiveYearTotalMove: number;
  };
  taxDetails: {
    transferTax: number;
    recordationTax: number;
    statutoryExemptionApplied: boolean;
  };
}
