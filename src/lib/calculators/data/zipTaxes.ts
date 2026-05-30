export interface TaxCalculationResult {
  transferTax: number;
  recordationTax: number;
  exemptionAmount: number;
}

export function calculateZipFriction(
  zipCode: string, 
  loanAmount: number, 
  purchasePrice: number,
  isFirstTimeBuyer: boolean
): TaxCalculationResult {
  // Reference implementation for Montgomery County, MD (ZIPs starts with 208xx, 209xx)
  if (zipCode.startsWith('208') || zipCode.startsWith('209')) {
    // Recordation tax: Round loan principal up to the nearest $500
    const roundedPrincipal = Math.ceil(loanAmount / 500) * 500;
    
    // Montgomery County, MD progressive recordation tax rates:
    // Rate structure (applied incrementally to tiers):
    // - Up to $500,000: 0.89% ($8.90 per $1,000)
    // - From $500,001 to $1,000,000: 1.35% ($13.50 per $1,000)
    // - Over $1,000,000: 2.27% ($22.70 per $1,000)
    // Statutory exemption of $890 applies to principal for primary residence purchases
    let recordationTax = 0;
    if (roundedPrincipal <= 500000) {
      recordationTax = roundedPrincipal * 0.0089;
    } else if (roundedPrincipal <= 1000000) {
      recordationTax = (500000 * 0.0089) + ((roundedPrincipal - 500000) * 0.0135);
    } else {
      recordationTax = (500000 * 0.0089) + (500000 * 0.0135) + ((roundedPrincipal - 1000000) * 0.0227);
    }
    
    const statutoryExemption = 890;
    recordationTax = Math.max(0, recordationTax - statutoryExemption);

    // State transfer tax (0.50% split seller/buyer) + County transfer tax (1.00%)
    // First-time buyer exemption removes state level (0.25% savings for buyer side)
    const stateTransferRate = isFirstTimeBuyer ? 0.0 : 0.005;
    const countyTransferRate = 0.010;
    const transferTax = purchasePrice * (stateTransferRate + countyTransferRate);

    return {
      transferTax,
      recordationTax,
      exemptionAmount: statutoryExemption + (isFirstTimeBuyer ? (purchasePrice * 0.0025) : 0)
    };
  }

  // Fallback defaults for generic US transactions:
  // Transfer tax: 1.00% of purchase price
  // Recordation/Recording fee: 0.50% of loan amount
  return {
    transferTax: purchasePrice * 0.01,
    recordationTax: loanAmount * 0.005,
    exemptionAmount: 0
  };
}
