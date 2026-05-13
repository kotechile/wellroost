import { useId, useState } from 'react';

import { calculateLeaseBreakPenalty } from '../../../lib/calculators/leaseBreak';
import { formatCurrency, formatPercent } from '../../../lib/calculators/format';
import type { LeaseBreakInputs, LeasePenaltyMethod } from '../../../lib/calculators/types';
import { CurrencyInput } from './fields/CurrencyInput';
import { SelectField } from './fields/SelectField';
import { StepperInput } from './fields/StepperInput';

const INITIAL_INPUTS: LeaseBreakInputs = {
	monthlyRent: 2500,
	remainingMonths: 8,
	selectedMethod: 'months',
	fixedFee: 3500,
	percentageFee: 25,
	monthsFee: 2,
	additionalCosts: 450,
	securityDeposit: 1800
};

const METHOD_GUIDANCE: Record<LeasePenaltyMethod, string> = {
	fixed: 'Use this when the lease states a flat dollar amount for breaking early.',
	percentage:
		'Use this when the contract charges a percentage of the value remaining on the lease.',
	months: 'Use this when the lease requires a certain number of months of rent as the penalty.'
};

export default function LeaseBreakCalculator() {
	const [inputs, setInputs] = useState(INITIAL_INPUTS);
	const fieldId = useId();
	const breakdown = calculateLeaseBreakPenalty(inputs);

	const updateInput = <K extends keyof LeaseBreakInputs>(key: K, value: LeaseBreakInputs[K]) => {
		setInputs((current) => ({ ...current, [key]: value }));
	};

	return (
		<div className="grid gap-6">
			<div className="grid gap-5 md:grid-cols-2">
				<CurrencyInput
					id={`${fieldId}-monthly-rent`}
					label="Monthly rent"
					value={inputs.monthlyRent}
					step={50}
					onChange={(value) => updateInput('monthlyRent', value)}
					helpText="Enter the rent you pay each month before utilities, parking, or other extras."
				/>
				<StepperInput
					id={`${fieldId}-remaining-term`}
					label="Remaining term"
					value={inputs.remainingMonths}
					min={0}
					step={1}
					suffix="Months"
					onChange={(value) => updateInput('remainingMonths', value)}
					helpText="Enter the number of whole months left on the lease agreement."
				/>
			</div>

			<div className="rounded-[1.6rem] border border-slate-800/90 bg-slate-950/40 p-5">
				<p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-300/70">
					Termination structure
				</p>
				<div className="mt-4 grid gap-5">
					<SelectField
						id={`${fieldId}-termination-method`}
						label="Termination fee selector"
						value={inputs.selectedMethod}
						onChange={(value) => updateInput('selectedMethod', value)}
						helpText={METHOD_GUIDANCE[inputs.selectedMethod]}
					/>
					<div className="grid gap-5 md:grid-cols-3">
						<CurrencyInput
							id={`${fieldId}-fixed-fee`}
							label="Fixed fee"
							value={inputs.fixedFee}
							step={100}
							onChange={(value) => updateInput('fixedFee', value)}
							helpText="If the lease names a flat termination amount, enter it here."
						/>
						<StepperInput
							id={`${fieldId}-percentage-fee`}
							label="Percentage fee"
							value={inputs.percentageFee}
							min={0}
							max={100}
							step={1}
							suffix="%"
							onChange={(value) => updateInput('percentageFee', value)}
							helpText="Enter the percentage applied to the remaining lease value."
						/>
						<StepperInput
							id={`${fieldId}-months-fee`}
							label="Months of rent"
							value={inputs.monthsFee}
							min={0}
							step={1}
							suffix="Months"
							onChange={(value) => updateInput('monthsFee', value)}
							helpText="Enter how many months of rent the lease requires as the fee."
						/>
					</div>
				</div>
			</div>

			<div className="grid gap-5 md:grid-cols-2">
				<CurrencyInput
					id={`${fieldId}-additional-costs`}
					label="Additional costs"
					value={inputs.additionalCosts}
					step={50}
					onChange={(value) => updateInput('additionalCosts', value)}
					helpText="Add cleaning, repairs, reletting costs, or any manual charges you already know about."
				/>
				<CurrencyInput
					id={`${fieldId}-security-deposit`}
					label="Security deposit amount"
					value={inputs.securityDeposit}
					step={50}
					onChange={(value) => updateInput('securityDeposit', value)}
					helpText="Enter the deposit you expect could offset part of the termination bill."
				/>
			</div>

			<div className="grid gap-4 rounded-[1.8rem] border border-cyan-500/20 bg-[linear-gradient(180deg,rgba(14,165,233,0.12),rgba(2,6,23,0.82))] p-6 shadow-[0_0_40px_rgba(56,189,248,0.12)]">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-200/80">
							Estimated termination summary
						</p>
						<h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">
							{formatCurrency(breakdown.netPenalty)}
						</h3>
						<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
							This estimate uses the maximum of the three penalty structures, then adds known
							costs and subtracts the available security deposit offset.
						</p>
					</div>
					<div className="rounded-full border border-cyan-400/20 bg-slate-950/40 px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-cyan-200/80">
						Primary method: {inputs.selectedMethod}
					</div>
				</div>

				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/55 p-4">
						<p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">
							Base termination fee
						</p>
						<p className="mt-3 text-2xl font-semibold text-white">
							{formatCurrency(breakdown.basePenalty)}
						</p>
						<p className="mt-2 text-sm text-slate-400">Highest contract penalty across all supported structures.</p>
					</div>
					<div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/55 p-4">
						<p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">
							Additional fees
						</p>
						<p className="mt-3 text-2xl font-semibold text-white">
							{formatCurrency(breakdown.additionalCosts)}
						</p>
						<p className="mt-2 text-sm text-slate-400">Cleaning, repairs, and any other manual charges.</p>
					</div>
					<div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/55 p-4">
						<p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">
							Deposit offset
						</p>
						<p className="mt-3 text-2xl font-semibold text-emerald-300">
							−{formatCurrency(breakdown.securityDepositOffset)}
						</p>
						<p className="mt-2 text-sm text-slate-400">Security deposit assumed to be available to reduce the bill.</p>
					</div>
					<div className="rounded-[1.4rem] border border-cyan-500/20 bg-slate-950/55 p-4 shadow-[0_0_30px_rgba(56,189,248,0.12)]">
						<p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">
							Net estimated penalty
						</p>
						<p className="mt-3 text-2xl font-semibold text-cyan-100">
							{formatCurrency(breakdown.netPenalty)}
						</p>
						<p className="mt-2 text-sm text-slate-400">Estimated amount still owed after the deposit is applied.</p>
					</div>
				</div>

				<div className="grid gap-3 rounded-[1.4rem] border border-slate-800 bg-slate-950/45 p-5 md:grid-cols-3">
					<div>
						<p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">
							Fixed fee path
						</p>
						<p className="mt-2 text-lg font-semibold text-white">
							{formatCurrency(breakdown.fixedPenalty)}
						</p>
					</div>
					<div>
						<p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">
							Percentage path
						</p>
						<p className="mt-2 text-lg font-semibold text-white">
							{formatCurrency(breakdown.percentagePenalty)}
						</p>
						<p className="mt-1 text-xs text-slate-500">
							{formatPercent(inputs.percentageFee)} of rent remaining
						</p>
					</div>
					<div>
						<p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-slate-500">
							Months-of-rent path
						</p>
						<p className="mt-2 text-lg font-semibold text-white">
							{formatCurrency(breakdown.monthsPenalty)}
						</p>
						<p className="mt-1 text-xs text-slate-500">
							{inputs.monthsFee} month{inputs.monthsFee === 1 ? '' : 's'} of rent
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
