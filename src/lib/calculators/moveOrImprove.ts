import { calculateZipFriction } from './data/zipTaxes';
import type { MoveOrImproveInputs, MoveOrImproveBreakdown, LedgerYearRow } from './moveOrImproveTypes';

// Monthly amortization payment
export function calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  if (annualRate <= 0) return principal / termMonths;
  const r = annualRate / 12;
  const N = termMonths;
  return principal * (r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);
}

// Prospective balance after m months
export function calculateProspectiveBalance(principal: number, annualRate: number, termMonths: number, m: number): number {
  if (principal <= 0) return 0;
  if (termMonths <= 0) return 0;
  if (m <= 0) return principal;
  if (m >= termMonths) return 0;
  if (annualRate <= 0) return Math.max(0, principal - (principal / termMonths) * m);
  
  const r = annualRate / 12;
  const N = termMonths;
  return principal * (Math.pow(1 + r, N) - Math.pow(1 + r, m)) / (Math.pow(1 + r, N) - 1);
}

export const PROJECT_ROI_DATABASE: Record<string, { label: string; baseRoi: number; permitFee: number }> = {
  'minor-kitchen': { label: 'Minor Kitchen Remodel', baseRoi: 0.85, permitFee: 450 },
  'major-kitchen': { label: 'Major Kitchen Remodel', baseRoi: 0.75, permitFee: 850 },
  'bath-remodel': { label: 'Bathroom Remodel', baseRoi: 0.70, permitFee: 350 },
  'shingle-roof': { label: 'Asphalt Shingle Roof Replacement', baseRoi: 0.61, permitFee: 200 },
  'addition-bed-bath': { label: 'Bedroom/Bathroom Addition', baseRoi: 0.68, permitFee: 1200 },
  'second-story': { label: 'Second-Story Addition', baseRoi: 0.55, permitFee: 2500 },
  'other': { label: 'Other Remodeling Projects', baseRoi: 0.50, permitFee: 500 }
};

export function runCapExMatrixCalculator(inputs: MoveOrImproveInputs): MoveOrImproveBreakdown {
  const { 
    currentValue, 
    annualAppreciation, 
    newPropertyPrice, 
    newMortgageRate, 
    newMortgageTermMonths, 
    legacyDebt, 
    friction, 
    renovation 
  } = inputs;
  
  // 1. Calculate project parameters
  const projectConfig = PROJECT_ROI_DATABASE[renovation.projectType] || PROJECT_ROI_DATABASE['other'];
  let activeRoi = projectConfig.baseRoi;
  
  // Complexity adjustments:
  // Additions with bedrooms/bathrooms deliver 15% to 25% value increases (we use a 20% relative uplift multiplier)
  if (renovation.addBedBath) {
    activeRoi = Math.min(1.2, activeRoi * 1.20);
  }
  
  const rawCost = renovation.quoteAmount;
  const overrunCost = rawCost * renovation.overrunRate;
  let totalQuoteCost = rawCost + overrunCost;
  
  // Second-story additions cost 50% more per unit
  if (renovation.isSecondStory) {
    totalQuoteCost = totalQuoteCost * 1.50;
  }
  
  const permitFee = projectConfig.permitFee;
  const initialRenovationCashOutlay = totalQuoteCost + permitFee;
  
  // 2. Amortization and projection for Improvement Pathway
  const legacyMonthlyPayment = calculateMonthlyPayment(
    legacyDebt.principalBalance, 
    legacyDebt.interestRate, 
    legacyDebt.remainingTermMonths
  );
  
  // Funding the Renovation:
  // Assume renovation is funded through a HELOC/Second mortgage with a 15-year (180 months) term at newMortgageRate + 1%
  const helocRate = newMortgageRate + 0.01;
  const helocPayment = calculateMonthlyPayment(initialRenovationCashOutlay, helocRate, 180);
  
  // 3. Move Pathway friction
  // Seller brokerage commissions
  const sellCommission = currentValue * friction.brokerCommissionRate;
  
  // Assuming a standard 20% down payment of the new property price or what was rolled over
  const assumedNewLoan = Math.max(0, newPropertyPrice - (currentValue - legacyDebt.principalBalance - sellCommission));
  const countyTaxDetails = calculateZipFriction(
    friction.zipCode, 
    assumedNewLoan, 
    newPropertyPrice, 
    friction.isFirstTimeBuyer
  );
  
  // Net cash from selling current home
  const sellFriction = sellCommission + countyTaxDetails.transferTax + friction.movingExpenses;
  const netHomeSaleProceeds = currentValue - legacyDebt.principalBalance - sellFriction;
  
  // Calculate remaining cash "delta" after buying the new home
  const deltaCashReceived = netHomeSaleProceeds - newPropertyPrice;
  
  // If delta is negative, a new mortgage is needed. Otherwise, new loan is 0.
  const newLoanAmount = deltaCashReceived < 0 ? Math.abs(deltaCashReceived) : 0;
  
  // If delta is positive, we downsized and keep the leftover cash in hand.
  const leftoverCash = deltaCashReceived > 0 ? deltaCashReceived : 0;
  
  const newMonthlyPayment = calculateMonthlyPayment(newLoanAmount, newMortgageRate, newMortgageTermMonths);
  
  // Calculate value boost from physical square footage addition vs standard ROI fallback
  let vRenovatedCompletion = currentValue;
  if (renovation.isAddition && renovation.currentSqft > 0 && renovation.addedSqft > 0) {
    const localPricePerSqft = currentValue / renovation.currentSqft;
    const realEstateEquityBoost = renovation.addedSqft * localPricePerSqft * 0.85; // 0.85 Integration Factor
    vRenovatedCompletion = currentValue + realEstateEquityBoost;
  } else {
    vRenovatedCompletion = currentValue + (totalQuoteCost * activeRoi);
  }
  
  // Year-by-year calculations (m = 12 * y)
  const improvePathway: LedgerYearRow[] = [];
  const movePathway: LedgerYearRow[] = [];
  
  const HYSA_YIELD_RATE = 0.04; // Money Market / HYSA yield
  
  // Year 0
  improvePathway.push({
    grossValue: currentValue,
    outstandingDebt: legacyDebt.principalBalance + initialRenovationCashOutlay,
    netEquity: currentValue - (legacyDebt.principalBalance + initialRenovationCashOutlay),
    cumulativePayments: 0,
    yearlySpent: 0
  });
  
  const upfrontMoveFees = sellFriction + countyTaxDetails.recordationTax;
  movePathway.push({
    grossValue: newPropertyPrice,
    outstandingDebt: newLoanAmount,
    netEquity: (newPropertyPrice + leftoverCash) - newLoanAmount,
    cumulativePayments: upfrontMoveFees,
    yearlySpent: upfrontMoveFees
  });

  for (let year = 1; year <= 5; year++) {
    const m = year * 12;
    
    // Improvement Pathway Calculations
    const vImprove = vRenovatedCompletion * Math.pow(1 + annualAppreciation, year);
    
    const legacyBal = calculateProspectiveBalance(
      legacyDebt.principalBalance, 
      legacyDebt.interestRate, 
      legacyDebt.remainingTermMonths, 
      m
    );
    const helocBal = calculateProspectiveBalance(initialRenovationCashOutlay, helocRate, 180, m);
    const outstandingDebtImprove = legacyBal + helocBal;
    
    // Add temporary rental housing costs for second-story additions (e.g. 6 months at $2500/month = $15,000 in first year)
    const annualExtraCosts = (renovation.isSecondStory && year === 1) ? (6 * 2500) : 0;
    const yearlySpentImprove = ((legacyMonthlyPayment + helocPayment) * 12) + annualExtraCosts;
    const cumPaymentsImprove = ((legacyMonthlyPayment + helocPayment) * m) + (renovation.isSecondStory && year >= 1 ? (6 * 2500) : 0);
    
    improvePathway.push({
      grossValue: vImprove,
      outstandingDebt: outstandingDebtImprove,
      netEquity: vImprove - outstandingDebtImprove,
      cumulativePayments: cumPaymentsImprove,
      yearlySpent: yearlySpentImprove
    });
    
    // Moving Pathway Calculations
    const vMove = newPropertyPrice * Math.pow(1 + annualAppreciation, year);
    const mortgageBalNew = calculateProspectiveBalance(newLoanAmount, newMortgageRate, newMortgageTermMonths, m);
    
    const compoundedCash = leftoverCash * Math.pow(1 + HYSA_YIELD_RATE, year);
    const yearlySpentMove = newMonthlyPayment * 12;
    const cumPaymentsMove = (newMonthlyPayment * m) + upfrontMoveFees;
    
    movePathway.push({
      grossValue: vMove,
      outstandingDebt: mortgageBalNew,
      netEquity: (vMove + compoundedCash) - mortgageBalNew,
      cumulativePayments: cumPaymentsMove,
      yearlySpent: yearlySpentMove
    });
  }
  
  const fiveYearExtraCosts = renovation.isSecondStory ? (6 * 2500) : 0;
  const fiveYearTotalImprove = ((legacyMonthlyPayment + helocPayment) * 60) + fiveYearExtraCosts;
  const fiveYearTotalMove = (newMonthlyPayment * 60) + upfrontMoveFees;
  
  const year5EquityVariance = improvePathway[5].netEquity - movePathway[5].netEquity;
  const year5PaymentVariance = fiveYearTotalImprove - fiveYearTotalMove;
  
  return {
    initialBaseline: {
      propertyValue: currentValue,
      debt: legacyDebt.principalBalance,
      equity: currentValue - legacyDebt.principalBalance
    },
    improvePathway,
    movePathway,
    variance: {
      year5EquityVariance,
      year5PaymentVariance,
      fiveYearTotalImprove,
      fiveYearTotalMove
    },
    taxDetails: {
      transferTax: countyTaxDetails.transferTax,
      recordationTax: countyTaxDetails.recordationTax,
      statutoryExemptionApplied: countyTaxDetails.exemptionAmount > 0
    }
  };
}
