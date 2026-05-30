import { useId, useState, useMemo } from 'react';
import { runCapExMatrixCalculator, PROJECT_ROI_DATABASE } from '../../../lib/calculators/moveOrImprove';
import { formatCurrency, formatPercent } from '../../../lib/calculators/format';
import type { MoveOrImproveInputs } from '../../../lib/calculators/moveOrImproveTypes';
import { CurrencyInput } from './fields/CurrencyInput';
import { StepperInput } from './fields/StepperInput';

const INITIAL_INPUTS: MoveOrImproveInputs = {
  currentValue: 500000,
  annualAppreciation: 0.03,
  newPropertyPrice: 700000,
  newMortgageRate: 0.065,
  newMortgageTermMonths: 360,
  legacyDebt: {
    principalBalance: 300000,
    interestRate: 0.035,
    remainingTermMonths: 240
  },
  friction: {
    zipCode: '20814', // Montgomery County, MD reference
    brokerCommissionRate: 0.06,
    buyerClosingCostRate: 0.03,
    movingExpenses: 5000,
    isFirstTimeBuyer: false
  },
  renovation: {
    projectType: 'minor-kitchen',
    quoteAmount: 85000,
    overrunRate: 0.10,
    addBedBath: false,
    isSecondStory: false
  }
};

const PROJECT_TYPE_OPTIONS = Object.entries(PROJECT_ROI_DATABASE).map(([key, config]) => ({
  value: key,
  label: config.label,
  roi: config.baseRoi,
  permit: config.permitFee
}));

/* ------------------------------------------------------------------ */
/* Tab description blurbs                                             */
/* ------------------------------------------------------------------ */
const TAB_DESCRIPTIONS: Record<string, string> = {
  current: 'Tell us about your current home and mortgage so we can project your existing equity growth.',
  improve: 'Describe your renovation project so we can estimate how much value it adds to your home.',
  move: 'Tell us about the home you\'d buy so we can compare the total cost of moving.'
};

export default function MoveOrImproveCalculator() {
  const [inputs, setInputs] = useState<MoveOrImproveInputs>(INITIAL_INPUTS);
  const [activeTab, setActiveTab] = useState<'current' | 'improve' | 'move'>('current');
  const [sensitivityPreset, setSensitivityPreset] = useState<'low' | 'base' | 'high' | 'custom'>('base');
  const [showLogic, setShowLogic] = useState(false);
  const fieldId = useId();

  // Run calculation engine
  const result = useMemo(() => {
    return runCapExMatrixCalculator(inputs);
  }, [inputs]);

  const updateInput = <K extends keyof MoveOrImproveInputs>(
    key: K,
    value: MoveOrImproveInputs[K]
  ) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const updateLegacyDebt = <K extends keyof MoveOrImproveInputs['legacyDebt']>(
    key: K,
    value: MoveOrImproveInputs['legacyDebt'][K]
  ) => {
    setInputs((prev) => ({
      ...prev,
      legacyDebt: { ...prev.legacyDebt, [key]: value }
    }));
  };

  const updateFriction = <K extends keyof MoveOrImproveInputs['friction']>(
    key: K,
    value: MoveOrImproveInputs['friction'][K]
  ) => {
    setInputs((prev) => ({
      ...prev,
      friction: { ...prev.friction, [key]: value }
    }));
  };

  const updateRenovation = <K extends keyof MoveOrImproveInputs['renovation']>(
    key: K,
    value: MoveOrImproveInputs['renovation'][K]
  ) => {
    setInputs((prev) => ({
      ...prev,
      renovation: { ...prev.renovation, [key]: value }
    }));
  };

  // Sensitivity presets
  const handleSensitivityChange = (preset: 'low' | 'base' | 'high') => {
    setSensitivityPreset(preset);
    let rate = 0.03;
    if (preset === 'low') rate = 0.015;
    if (preset === 'high') rate = 0.055;
    updateInput('annualAppreciation', rate);
  };

  // Determine which option yields more equity
  const improveEquityYear5 = result.improvePathway[5].netEquity;
  const moveEquityYear5 = result.movePathway[5].netEquity;
  const variance = Math.abs(result.variance.year5EquityVariance);
  const improveIsBetter = result.variance.year5EquityVariance >= 0;

  return (
    <div className="grid gap-8">
      {/* ============================================================ */}
      {/* 1. HEADER SPOTLIGHT — Plain-English verdict                  */}
      {/* ============================================================ */}
      <div className="overflow-hidden rounded-[1.8rem] border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(2,44,23,0.92),rgba(2,6,23,0.98)_70%,rgba(16,185,129,0.12))] p-6 shadow-[0_0_40px_rgba(16,185,129,0.08)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80">
              Your 5-Year Projection
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {improveIsBetter
                ? `Renovating Wins by ${formatCurrency(variance)}`
                : `Moving Wins by ${formatCurrency(variance)}`}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              {improveIsBetter ? (
                <>
                  If you stay and renovate, you're projected to have{' '}
                  <span className="font-semibold text-emerald-400">
                    {formatCurrency(variance)} more
                  </span>{' '}
                  in home equity after 5 years compared to selling and buying a new place.
                </>
              ) : (
                <>
                  If you sell and buy a new home, you're projected to have{' '}
                  <span className="font-semibold text-cyan-400">
                    {formatCurrency(variance)} more
                  </span>{' '}
                  in home equity after 5 years, even after commissions and closing costs.
                </>
              )}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.24em] text-slate-200">
                Holding Period: 60 Months
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.24em] text-slate-200">
                ZIP: {inputs.friction.zipCode}
              </span>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/45 p-6 flex flex-col justify-between">
            <div>
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-slate-400">
                The Difference (Year 5)
              </p>
              <h3 className={`mt-2 text-4xl font-semibold tracking-tight tabular-nums ${improveIsBetter ? 'text-emerald-400' : 'text-cyan-400'}`}>
                {formatCurrency(variance)}
              </h3>
              <p className="mt-2 text-xs text-slate-400">
                {improveIsBetter
                  ? 'Renovating outperforms moving after all transaction costs, interest, and remodeling overruns.'
                  : 'Moving builds higher equity despite commissions and transfer taxes.'}
              </p>
            </div>

            <div className="mt-6 border-t border-white/10 pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-500">
                  Equity if You Renovate
                </p>
                <p className="mt-1 text-lg font-semibold text-white tabular-nums">
                  {formatCurrency(improveEquityYear5)}
                </p>
              </div>
              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-500">
                  Equity if You Move
                </p>
                <p className="mt-1 text-lg font-semibold text-white tabular-nums">
                  {formatCurrency(moveEquityYear5)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. INTERACTIVE INPUT PANEL                                    */}
      {/* ============================================================ */}
      <div className="rounded-[1.8rem] border border-slate-800/90 bg-slate-950/40 p-5">
        {/* Tab Buttons */}
        <div className="flex border-b border-slate-800 pb-4">
          <nav className="flex flex-wrap gap-2" aria-label="Calculator steps">
            <button
              onClick={() => setActiveTab('current')}
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'current'
                  ? 'bg-emerald-900 border border-emerald-800 text-white shadow-md shadow-emerald-950/50'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 hover:text-white hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              1 · Your Home
            </button>
            <button
              onClick={() => setActiveTab('improve')}
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'improve'
                  ? 'bg-emerald-900 border border-emerald-800 text-white shadow-md shadow-emerald-950/50'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 hover:text-white hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              2 · Renovation
            </button>
            <button
              onClick={() => setActiveTab('move')}
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'move'
                  ? 'bg-emerald-900 border border-emerald-800 text-white shadow-md shadow-emerald-950/50'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 hover:text-white hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              3 · Relocation
            </button>
          </nav>
        </div>

        {/* Tab description */}
        <p className="mt-4 text-sm text-slate-400 leading-6">
          {TAB_DESCRIPTIONS[activeTab]}
        </p>

        {/* Tab 1 Content: Current Home & Mortgage */}
        {activeTab === 'current' && (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <CurrencyInput
              id={`${fieldId}-current-val`}
              eyebrow="Asset"
              label="Current home value"
              value={inputs.currentValue}
              step={10000}
              onChange={(val) => updateInput('currentValue', val)}
              helpText="The estimated market value of your property today."
            />
            <CurrencyInput
              id={`${fieldId}-legacy-bal`}
              eyebrow="Debt"
              label="Remaining mortgage balance"
              value={inputs.legacyDebt.principalBalance}
              step={5000}
              onChange={(val) => updateLegacyDebt('principalBalance', val)}
              helpText="How much you still owe on your existing mortgage."
            />
            <label className="grid gap-3 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-slate-700/90">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-100">Your current mortgage rate</span>
                <span className="font-mono text-sm text-emerald-400">{formatPercent(Number((inputs.legacyDebt.interestRate * 100).toFixed(2)))}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.12"
                step="0.001"
                value={inputs.legacyDebt.interestRate}
                onChange={(e) => updateLegacyDebt('interestRate', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <p className="text-sm leading-6 text-slate-400">The low locked rate you'd give up if you sell.</p>
            </label>
            <StepperInput
              id={`${fieldId}-legacy-term`}
              eyebrow="Term"
              label="Months left on your mortgage"
              value={inputs.legacyDebt.remainingTermMonths}
              min={12}
              max={360}
              step={12}
              suffix="Months"
              onChange={(val) => updateLegacyDebt('remainingTermMonths', val)}
              helpText="How many months until your current loan is paid off."
            />
          </div>
        )}

        {/* Tab 2 Content: Renovation Pathway */}
        {activeTab === 'improve' && (
          <div className="mt-5 grid gap-5">
            <div className="grid gap-3 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <span className="text-sm font-semibold text-slate-100">What kind of project?</span>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {PROJECT_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateRenovation('projectType', option.value)}
                    className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                      inputs.renovation.projectType === option.value
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                        : 'border-slate-800 bg-slate-950/60 text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-white">{option.label}</div>
                    <div className="mt-1 flex justify-between text-slate-300">
                      <span>Est. ROI: {formatPercent(Number((option.roi * 100).toFixed(2)))}</span>
                      <span>Permits: ${option.permit}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <CurrencyInput
                id={`${fieldId}-quote-amt`}
                eyebrow="Remodel cost"
                label="Contractor quote amount"
                value={inputs.renovation.quoteAmount}
                step={5000}
                onChange={(val) => updateRenovation('quoteAmount', val)}
                helpText="The builder's estimated contract cost."
              />

              <label className="grid gap-3 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-slate-700/90">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100">Budget buffer for overruns</span>
                  <span className="font-mono text-sm text-emerald-400">+{formatPercent(Number((inputs.renovation.overrunRate * 100).toFixed(2)))}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.5"
                  step="0.05"
                  value={inputs.renovation.overrunRate}
                  onChange={(e) => updateRenovation('overrunRate', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <p className="text-sm leading-6 text-slate-400">Extra margin for unexpected cost spikes (10–15% is typical).</p>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] flex flex-col justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-100">Additional scope</span>
                  <p className="mt-1 text-xs text-slate-400">These options change the projected cost and ROI.</p>
                </div>
                <div className="mt-4 space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inputs.renovation.addBedBath}
                      onChange={(e) => updateRenovation('addBedBath', e.target.checked)}
                      className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500/20"
                    />
                    <span className="text-xs text-slate-200">Adding a bedroom or bathroom (+20% ROI lift)</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inputs.renovation.isSecondStory}
                      onChange={(e) => updateRenovation('isSecondStory', e.target.checked)}
                      className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500/20"
                    />
                    <span className="text-xs text-slate-200">Second-story addition (+50% cost, 6 months temp rent)</span>
                  </label>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 flex flex-col justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-100">How you'll pay for it</span>
                  <p className="mt-1 text-xs text-slate-400">Assumes a standard renovation loan.</p>
                </div>
                <div className="mt-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Funding Type:</span>
                    <span className="text-white font-medium">Renovation HELOC</span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-300">
                    <span>HELOC Rate:</span>
                    <span className="text-white font-semibold">{formatPercent(Number(((inputs.newMortgageRate + 0.01) * 100).toFixed(2)))}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-300">
                    <span>HELOC Term:</span>
                    <span className="text-white font-semibold">180 Months (15 Yrs)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3 Content: Relocation Pathway */}
        {activeTab === 'move' && (
          <div className="mt-5 grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <CurrencyInput
                id={`${fieldId}-new-prop-price`}
                eyebrow="Move target"
                label="New property purchase price"
                value={inputs.newPropertyPrice}
                step={10000}
                onChange={(val) => updateInput('newPropertyPrice', val)}
                helpText="The purchase price of the home you'd move to."
              />

              <label className="grid gap-3 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-slate-700/90">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100">New mortgage interest rate</span>
                  <span className="font-mono text-sm text-cyan-400">{formatPercent(Number((inputs.newMortgageRate * 100).toFixed(2)))}</span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.12"
                  step="0.001"
                  value={inputs.newMortgageRate}
                  onChange={(e) => updateInput('newMortgageRate', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <p className="text-sm leading-6 text-slate-400">Today's prevailing mortgage rates for new loans.</p>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <label className="grid gap-3 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-slate-700/90">
                <span className="text-sm font-semibold text-slate-100">Your ZIP Code</span>
                <input
                  type="text"
                  value={inputs.friction.zipCode}
                  onChange={(e) => updateFriction('zipCode', e.target.value)}
                  placeholder="20814"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                />
                <p className="text-sm leading-6 text-slate-400">Used to estimate local transfer taxes and recording fees (default: Montgomery County, MD).</p>
              </label>

              <label className="grid gap-3 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-slate-700/90">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100">Broker commissions</span>
                  <span className="font-mono text-xs text-cyan-400">{formatPercent(Number((inputs.friction.brokerCommissionRate * 100).toFixed(2)))}</span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.08"
                  step="0.005"
                  value={inputs.friction.brokerCommissionRate}
                  onChange={(e) => updateFriction('brokerCommissionRate', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <p className="text-sm leading-6 text-slate-400">Total seller-side agent commissions.</p>
              </label>

              <label className="grid gap-3 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-slate-700/90">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100">Closing costs</span>
                  <span className="font-mono text-xs text-cyan-400">{formatPercent(Number((inputs.friction.buyerClosingCostRate * 100).toFixed(2)))}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.06"
                  step="0.005"
                  value={inputs.friction.buyerClosingCostRate}
                  onChange={(e) => updateFriction('buyerClosingCostRate', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <p className="text-sm leading-6 text-slate-400">Buyer-side fees (lender, escrow, title).</p>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <CurrencyInput
                id={`${fieldId}-moving-exp`}
                eyebrow="Moving costs"
                label="Moving expenses (packing, trucks, etc.)"
                value={inputs.friction.movingExpenses}
                step={500}
                onChange={(val) => updateFriction('movingExpenses', val)}
                helpText="Physical moving, packing, and setup costs."
              />

              <label className="grid gap-3 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-slate-700/90 flex flex-col justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-100">First-time homebuyer?</span>
                  <p className="mt-1 text-xs text-slate-400">May waive transfer taxes in some jurisdictions.</p>
                </div>
                <label className="flex items-center space-x-3 cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={inputs.friction.isFirstTimeBuyer}
                    onChange={(e) => updateFriction('isFirstTimeBuyer', e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500/20"
                  />
                  <span className="text-xs text-slate-200">Yes, I qualify for the first-time buyer exemption</span>
                </label>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 3. SENSITIVITY — "What if home prices change?"               */}
      {/* ============================================================ */}
      <div className="rounded-[1.8rem] border border-slate-800 bg-slate-950/30 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-emerald-400 font-semibold">
              Market Scenario
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              What if home prices change?
            </h3>
          </div>
          {/* Preset Buttons */}
          <div className="flex bg-slate-950 p-1 rounded-full border border-slate-800 space-x-1">
            <button
              onClick={() => handleSensitivityChange('low')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition cursor-pointer ${
                sensitivityPreset === 'low'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Flat (1.5%)
            </button>
            <button
              onClick={() => handleSensitivityChange('base')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition cursor-pointer ${
                sensitivityPreset === 'base'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Base (3.0%)
            </button>
            <button
              onClick={() => handleSensitivityChange('high')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition cursor-pointer ${
                sensitivityPreset === 'high'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              High (5.5%)
            </button>
          </div>
        </div>

        {/* Custom Appreciation Slider */}
        <div className="mt-6 grid gap-4 md:grid-cols-2 items-center">
          <label className="grid gap-2">
            <div className="flex justify-between text-xs font-mono text-slate-300">
              <span>Annual home price growth:</span>
              <span className="text-white font-semibold">{formatPercent(Number((inputs.annualAppreciation * 100).toFixed(2)))}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.10"
              step="0.005"
              value={inputs.annualAppreciation}
              onChange={(e) => {
                setSensitivityPreset('custom');
                updateInput('annualAppreciation', parseFloat(e.target.value));
              }}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </label>
          <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 text-xs text-slate-200 leading-6">
            <span className="inline-flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6c0 1.56.806 2.933 2.024 3.726a.75.75 0 0 1 .351.636v1.888h4.25V10.36a.75.75 0 0 1 .352-.637A4.5 4.5 0 0 0 8 1.5ZM5.75 13.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z" />
              </svg>
              Rule of Thumb
            </span>
            <p className="text-slate-300">
              High-appreciation markets tend to favor <strong className="text-white">moving</strong> (larger asset base = bigger absolute gains). Flat or slow markets favor <strong className="text-white">renovating</strong> (transaction fees eat into the move).
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. LEDGER — "Your 5-Year Comparison"                         */}
      {/* ============================================================ */}
      <div className="rounded-[1.8rem] border border-slate-800/90 bg-slate-900/45 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-slate-200 font-semibold">Your 5-Year Comparison</p>
          {/* Color Legend */}
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Renovate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
              Move
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700 text-slate-300 uppercase tracking-wider font-mono bg-slate-950/40">
                <th className="py-3 px-3">Metric</th>
                <th className="py-3 px-3">Year 0</th>
                <th className="py-3 px-3">Year 1</th>
                <th className="py-3 px-3">Year 3</th>
                <th className="py-3 px-3 text-right">Year 5</th>
              </tr>
            </thead>
            <tbody className="font-medium text-white">
              {/* ——— Home Value Group ——— */}
              <tr className="border-t-2 border-slate-700/50">
                <td colSpan={5} className="py-2 px-3 text-[0.65rem] font-mono uppercase tracking-widest text-slate-500">Home Value</td>
              </tr>
              <tr className="bg-slate-950/40 hover:bg-slate-950/60 border-b border-slate-800/40">
                <td className="py-3.5 px-3 font-semibold"><span className="text-emerald-400 font-bold mr-1.5">Renovate:</span>Home Value</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.improvePathway[0].grossValue)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.improvePathway[1].grossValue)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.improvePathway[3].grossValue)}</td>
                <td className="py-3.5 px-3 tabular-nums text-right font-semibold text-emerald-400">{formatCurrency(result.improvePathway[5].grossValue)}</td>
              </tr>
              <tr className="bg-slate-900/30 hover:bg-slate-900/50 border-b border-slate-800/40">
                <td className="py-3.5 px-3 font-semibold"><span className="text-cyan-400 font-bold mr-1.5">Move:</span>Home Value</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[0].grossValue)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[1].grossValue)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[3].grossValue)}</td>
                <td className="py-3.5 px-3 tabular-nums text-right font-semibold text-cyan-400">{formatCurrency(result.movePathway[5].grossValue)}</td>
              </tr>

              {/* ——— Debt Group ——— */}
              <tr className="border-t-2 border-slate-700/50">
                <td colSpan={5} className="py-2 px-3 text-[0.65rem] font-mono uppercase tracking-widest text-slate-500">What You Owe</td>
              </tr>
              <tr className="bg-slate-950/40 hover:bg-slate-950/60 border-b border-slate-800/40">
                <td className="py-3.5 px-3 font-semibold"><span className="text-emerald-400 font-bold mr-1.5">Renovate:</span>Debt</td>
                <td className="py-3.5 px-3 tabular-nums text-rose-400">{formatCurrency(result.improvePathway[0].outstandingDebt)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.improvePathway[1].outstandingDebt)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.improvePathway[3].outstandingDebt)}</td>
                <td className="py-3.5 px-3 tabular-nums text-right font-semibold">{formatCurrency(result.improvePathway[5].outstandingDebt)}</td>
              </tr>
              <tr className="bg-slate-900/30 hover:bg-slate-900/50 border-b border-slate-800/40">
                <td className="py-3.5 px-3 font-semibold"><span className="text-cyan-400 font-bold mr-1.5">Move:</span>Debt</td>
                <td className="py-3.5 px-3 tabular-nums text-rose-400">{formatCurrency(result.movePathway[0].outstandingDebt)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[1].outstandingDebt)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[3].outstandingDebt)}</td>
                <td className="py-3.5 px-3 tabular-nums text-right font-semibold">{formatCurrency(result.movePathway[5].outstandingDebt)}</td>
              </tr>

              {/* ——— Net Equity Group (hero rows) ——— */}
              <tr className="border-t-2 border-slate-700/50">
                <td colSpan={5} className="py-2 px-3 text-[0.65rem] font-mono uppercase tracking-widest text-slate-500">Net Equity (Value − Debt)</td>
              </tr>
              <tr className="bg-emerald-950 border-y border-emerald-800/80">
                <td className="py-3.5 px-3 font-bold"><span className="text-emerald-300 font-bold mr-1.5">Renovate:</span>Net Equity</td>
                <td className="py-3.5 px-3 tabular-nums font-semibold text-emerald-100">{formatCurrency(result.improvePathway[0].netEquity)}</td>
                <td className="py-3.5 px-3 tabular-nums font-semibold text-emerald-100">{formatCurrency(result.improvePathway[1].netEquity)}</td>
                <td className="py-3.5 px-3 tabular-nums font-semibold text-emerald-100">{formatCurrency(result.improvePathway[3].netEquity)}</td>
                <td className="py-3.5 px-3 tabular-nums text-right font-extrabold text-sm text-emerald-300 bg-emerald-900 border border-emerald-700/80 rounded px-2.5 py-1.5 shadow-[inset_0_0_12px_rgba(16,185,129,0.3)]">{formatCurrency(result.improvePathway[5].netEquity)}</td>
              </tr>
              <tr className="bg-cyan-950 border-y border-cyan-800/80">
                <td className="py-3.5 px-3 font-bold"><span className="text-cyan-300 font-bold mr-1.5">Move:</span>Net Equity</td>
                <td className="py-3.5 px-3 tabular-nums font-semibold text-cyan-100">{formatCurrency(result.movePathway[0].netEquity)}</td>
                <td className="py-3.5 px-3 tabular-nums font-semibold text-cyan-100">{formatCurrency(result.movePathway[1].netEquity)}</td>
                <td className="py-3.5 px-3 tabular-nums font-semibold text-cyan-100">{formatCurrency(result.movePathway[3].netEquity)}</td>
                <td className="py-3.5 px-3 tabular-nums text-right font-extrabold text-sm text-cyan-300 bg-cyan-900 border border-cyan-700/80 rounded px-2.5 py-1.5 shadow-[inset_0_0_12px_rgba(34,211,238,0.3)]">{formatCurrency(result.movePathway[5].netEquity)}</td>
              </tr>

              {/* ——— Total Paid Out Group ——— */}
              <tr className="border-t-2 border-slate-700/50">
                <td colSpan={5} className="py-2 px-3 text-[0.65rem] font-mono uppercase tracking-widest text-slate-500">Total Paid Out</td>
              </tr>
              <tr className="bg-slate-950/40 hover:bg-slate-950/60 border-b border-slate-800/40">
                <td className="py-3.5 px-3 font-semibold"><span className="text-emerald-400 font-bold mr-1.5">Renovate:</span>Total Paid</td>
                <td className="py-3.5 px-3 tabular-nums">$0</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.improvePathway[1].cumulativePayments)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.improvePathway[3].cumulativePayments)}</td>
                <td className="py-3.5 px-3 tabular-nums text-right font-semibold">{formatCurrency(result.improvePathway[5].cumulativePayments)}</td>
              </tr>
              <tr className="bg-slate-900/30 hover:bg-slate-900/50">
                <td className="py-3.5 px-3 font-semibold"><span className="text-cyan-400 font-bold mr-1.5">Move:</span>Total Paid</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[0].cumulativePayments)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[1].cumulativePayments)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[3].cumulativePayments)}</td>
                <td className="py-3.5 px-3 tabular-nums text-right font-semibold">{formatCurrency(result.movePathway[5].cumulativePayments)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ——— BOTTOM-LINE SUMMARY ——— */}
        <div className={`mt-6 rounded-[1.3rem] p-5 border ${
          improveIsBetter
            ? 'border-emerald-700/50 bg-emerald-950/60'
            : 'border-cyan-700/50 bg-cyan-950/60'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">{improveIsBetter ? '🏠' : '🚚'}</span>
            <div className="text-sm leading-7 text-slate-200">
              {improveIsBetter ? (
                <>
                  <strong className="text-emerald-300">Bottom line: Staying and renovating</strong> is projected to leave you with{' '}
                  <strong className="text-white">{formatCurrency(improveEquityYear5)}</strong> in equity after 5 years — that's{' '}
                  <strong className="text-emerald-400">{formatCurrency(variance)} more</strong> than if you sold and bought a new home.
                  You'd pay <strong className="text-white">{formatCurrency(result.improvePathway[5].cumulativePayments)}</strong> total over 60 months in mortgage and HELOC payments, but your home's value grows to{' '}
                  <strong className="text-white">{formatCurrency(result.improvePathway[5].grossValue)}</strong>.
                </>
              ) : (
                <>
                  <strong className="text-cyan-300">Bottom line: Selling and buying a new home</strong> is projected to leave you with{' '}
                  <strong className="text-white">{formatCurrency(moveEquityYear5)}</strong> in equity after 5 years — that's{' '}
                  <strong className="text-cyan-400">{formatCurrency(variance)} more</strong> than if you stayed and renovated, even after broker commissions, transfer taxes, and closing costs.
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tax Detail Cards */}
        <div className="mt-6 border-t border-slate-800 pt-5 grid gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <span className="font-mono text-slate-400 uppercase tracking-wider block">State Transfer Tax</span>
            <span className="mt-1 block text-sm font-semibold text-white tabular-nums">
              {formatCurrency(result.taxDetails.transferTax)}
            </span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <span className="font-mono text-slate-400 uppercase tracking-wider block">Recording Fees</span>
            <span className="mt-1 block text-sm font-semibold text-white tabular-nums">
              {formatCurrency(result.taxDetails.recordationTax)}
            </span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <span className="font-mono text-slate-400 uppercase tracking-wider block">Tax Exemptions</span>
            <span className={`mt-1 block text-xs font-bold ${result.taxDetails.statutoryExemptionApplied ? 'text-emerald-400' : 'text-slate-300'}`}>
              {result.taxDetails.statutoryExemptionApplied ? 'Montgomery County Exemption Applied' : 'No Local Exemptions'}
            </span>
          </div>
        </div>

        {/* Collapsible Accordion for Calculation Logic */}
        <div className="mt-6 border-t border-slate-800/60 pt-5">
          <button
            onClick={() => setShowLogic(!showLogic)}
            className="flex items-center justify-between w-full py-2 text-xs font-mono uppercase tracking-wider text-slate-300 hover:text-white transition focus:outline-none cursor-pointer"
          >
            <span>{showLogic ? '▼' : '▶'} How we calculated this</span>
            <span className="text-slate-500 text-[10px]">{showLogic ? 'Collapse' : 'Expand'}</span>
          </button>

          {showLogic && (
            <div className="mt-4 p-5 rounded-2xl border border-slate-800/80 bg-slate-950/60 font-sans text-xs leading-6 text-slate-200 space-y-4">
              <p className="text-slate-400 text-[11px]">
                Here's the math behind your projection, broken into the two pathways.
              </p>
              <div>
                <h4 className="font-bold text-white text-sm mb-2">1. Renovation Pathway</h4>
                <p>Models your home's future value based on your renovation cost and its expected ROI, compounded over time with annual appreciation.</p>
                <div className="mt-2 font-mono text-[11px] bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-emerald-400">
                  Home Value(y) = (Current Value + Quote × ROI) × (1 + Growth)^y<br />
                  Net Equity(5) = Home Value(5) − Mortgage Balance(60) − HELOC Balance(60)
                </div>
              </div>
              <div>
                <h4 className="font-bold text-white text-sm mb-2">2. Relocation Pathway</h4>
                <p>Models selling your current property, paying localized transaction taxes and commissions, and purchasing a new asset with a new market-rate loan.</p>
                <div className="mt-2 font-mono text-[11px] bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-cyan-400">
                  Home Value(y) = New Purchase Price × (1 + Growth)^y<br />
                  Net Equity(5) = Home Value(5) − New Mortgage Balance(60)
                </div>
              </div>
              <div className="text-slate-400 text-[10px] border-t border-slate-800/80 pt-3">
                * The engine calculates full amortization schedules for legacy mortgage, HELOC, and new relocation loan over a 60-month holding period using standard fixed-rate amortization formulas.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
