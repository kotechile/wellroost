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

export default function MoveOrImproveCalculator() {
  const [inputs, setInputs] = useState<MoveOrImproveInputs>(INITIAL_INPUTS);
  const [activeTab, setActiveTab] = useState<'current' | 'improve' | 'move'>('current');
  const [sensitivityPreset, setSensitivityPreset] = useState<'low' | 'base' | 'high' | 'custom'>('base');
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
      {/* 1. Header & Summary Spotlight */}
      <div className="overflow-hidden rounded-[1.8rem] border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(2,44,23,0.92),rgba(2,6,23,0.98)_70%,rgba(16,185,129,0.12))] p-6 shadow-[0_0_40px_rgba(16,185,129,0.08)] sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-200/80">
              5-Year Net Equity Ledger Projection
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {improveIsBetter ? 'Improvement Pathway Favored' : 'Relocation Pathway Favored'}
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              By staying in your current home and completing the renovation, you are projected to build{' '}
              <span className="font-semibold text-emerald-400">
                {formatCurrency(variance)}
              </span>{' '}
              {improveIsBetter ? 'more' : 'less'} net equity over the next 5 years compared to selling and moving.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.24em] text-slate-200">
                Holding Period: 60 Months
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-[0.24em] text-slate-200">
                Tax Location Model: {inputs.friction.zipCode}
              </span>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/45 p-6 flex flex-col justify-between">
            <div>
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-slate-400">
                Pathway Variance (Year 5)
              </p>
              <h3 className={`mt-2 text-4xl font-semibold tracking-tight tabular-nums ${improveIsBetter ? 'text-emerald-400' : 'text-cyan-400'}`}>
                {formatCurrency(variance)}
              </h3>
              <p className="mt-2 text-xs text-slate-400">
                {improveIsBetter 
                  ? 'Improving outperforms moving after all transaction costs, interest, and remodeling overruns.' 
                  : 'Moving creates a higher equity return despite commissions and transfer taxes.'}
              </p>
            </div>

            <div className="mt-6 border-t border-white/10 pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-500">
                  Improve Equity
                </p>
                <p className="mt-1 text-lg font-semibold text-white tabular-nums">
                  {formatCurrency(improveEquityYear5)}
                </p>
              </div>
              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-500">
                  Move Equity
                </p>
                <p className="mt-1 text-lg font-semibold text-white tabular-nums">
                  {formatCurrency(moveEquityYear5)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Input Panel */}
      <div className="rounded-[1.8rem] border border-slate-800/90 bg-slate-950/40 p-5">
        {/* Tab Buttons */}
        <div className="flex border-b border-slate-800 pb-4">
          <nav className="flex space-x-2" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('current')}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === 'current'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'border border-transparent text-slate-400 hover:text-white'
              }`}
            >
              1. Current Home & Debt
            </button>
            <button
              onClick={() => setActiveTab('improve')}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === 'improve'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'border border-transparent text-slate-400 hover:text-white'
              }`}
            >
              2. Renovation (Improve)
            </button>
            <button
              onClick={() => setActiveTab('move')}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                activeTab === 'move'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'border border-transparent text-slate-400 hover:text-white'
              }`}
            >
              3. Relocation (Move)
            </button>
          </nav>
        </div>

        {/* Tab 1 Content: Current Home & Mortgage */}
        {activeTab === 'current' && (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <CurrencyInput
              id={`${fieldId}-current-val`}
              eyebrow="Asset"
              label="Current home value (V0)"
              value={inputs.currentValue}
              step={10000}
              onChange={(val) => updateInput('currentValue', val)}
              helpText="The estimated market value of your property today."
            />
            <CurrencyInput
              id={`${fieldId}-legacy-bal`}
              eyebrow="Debt"
              label="Primary mortgage balance"
              value={inputs.legacyDebt.principalBalance}
              step={5000}
              onChange={(val) => updateLegacyDebt('principalBalance', val)}
              helpText="The remaining principal on your existing mortgage."
            />
            <label className="grid gap-3 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-slate-700/90">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-100">Locked-in interest rate</span>
                <span className="font-mono text-sm text-emerald-400">{formatPercent(inputs.legacyDebt.interestRate * 100)}</span>
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
              <span className="text-xs text-slate-400">The low locked rate you forfeit if you sell.</span>
            </label>
            <StepperInput
              id={`${fieldId}-legacy-term`}
              eyebrow="Term"
              label="Remaining mortgage term"
              value={inputs.legacyDebt.remainingTermMonths}
              min={12}
              max={360}
              step={12}
              suffix="Months"
              onChange={(val) => updateLegacyDebt('remainingTermMonths', val)}
              helpText="Remaining months on your primary legacy loan."
            />
          </div>
        )}

        {/* Tab 2 Content: Renovation Pathway */}
        {activeTab === 'improve' && (
          <div className="mt-5 grid gap-5">
            <div className="grid gap-3 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <span className="text-sm font-semibold text-slate-100">Project type (ROI presets)</span>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {PROJECT_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateRenovation('projectType', option.value)}
                    className={`p-3 rounded-xl border text-left text-xs transition ${
                      inputs.renovation.projectType === option.value
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-white">{option.label}</div>
                    <div className="mt-1 flex justify-between">
                      <span>Est. ROI: {formatPercent(option.roi * 100)}</span>
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
                  <span className="text-sm font-semibold text-slate-100">Project overrun margin</span>
                  <span className="font-mono text-sm text-emerald-400">+{formatPercent(inputs.renovation.overrunRate * 100)}</span>
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
                <span className="text-xs text-slate-400">Buffers budget for unseen contractor spikes.</span>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] flex flex-col justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-100">Structural complexity rules</span>
                  <p className="mt-1 text-xs text-slate-400">Modify structural parameters that impact ROI & rental needs.</p>
                </div>
                <div className="mt-4 space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inputs.renovation.addBedBath}
                      onChange={(e) => updateRenovation('addBedBath', e.target.checked)}
                      className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500/20"
                    />
                    <span className="text-xs text-slate-200">Bedroom/Bathroom addition (+20% ROI lift)</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inputs.renovation.isSecondStory}
                      onChange={(e) => updateRenovation('isSecondStory', e.target.checked)}
                      className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500/20"
                    />
                    <span className="text-xs text-slate-200">Second-story addition (+50% cost & 6-month temp rent)</span>
                  </label>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 flex flex-col justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-100">Renovation Funding method</span>
                  <p className="mt-1 text-xs text-slate-400">Assumes standard secondary funding model.</p>
                </div>
                <div className="mt-4 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Funding Type:</span>
                    <span className="text-white font-medium">Renovation HELOC</span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-300">
                    <span>HELOC Rate:</span>
                    <span className="text-white font-medium">{formatPercent((inputs.newMortgageRate + 0.01) * 100)}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-slate-300">
                    <span>HELOC Term:</span>
                    <span className="text-white font-medium">180 Months (15 Yrs)</span>
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
                helpText="The purchase price of the next residence."
              />

              <label className="grid gap-3 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-slate-700/90">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100">New mortgage interest rate</span>
                  <span className="font-mono text-sm text-emerald-400">{formatPercent(inputs.newMortgageRate * 100)}</span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.12"
                  step="0.001"
                  value={inputs.newMortgageRate}
                  onChange={(e) => updateInput('newMortgageRate', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <span className="text-xs text-slate-400">Current prevailing market mortgage rates.</span>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <label className="grid gap-3 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-slate-700/90">
                <span className="text-sm font-semibold text-slate-100">Friction Zip Code</span>
                <input
                  type="text"
                  value={inputs.friction.zipCode}
                  onChange={(e) => updateFriction('zipCode', e.target.value)}
                  placeholder="20814"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                />
                <span className="text-[10px] text-slate-400">Sets transfer & recordation tax matrices.</span>
              </label>

              <label className="grid gap-3 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-slate-700/90">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100">Commissions</span>
                  <span className="font-mono text-xs text-emerald-400">{formatPercent(inputs.friction.brokerCommissionRate * 100)}</span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.08"
                  step="0.005"
                  value={inputs.friction.brokerCommissionRate}
                  onChange={(e) => updateFriction('brokerCommissionRate', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <span className="text-xs text-slate-400">Broker seller commissions.</span>
              </label>

              <label className="grid gap-3 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-slate-700/90">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100">Buyer Closing Costs</span>
                  <span className="font-mono text-xs text-emerald-400">{formatPercent(inputs.friction.buyerClosingCostRate * 100)}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.06"
                  step="0.005"
                  value={inputs.friction.buyerClosingCostRate}
                  onChange={(e) => updateFriction('buyerClosingCostRate', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <span className="text-xs text-slate-400">Purchasing fees (lender/escrow).</span>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <CurrencyInput
                id={`${fieldId}-moving-exp`}
                eyebrow="Moving costs"
                label="Physical moving expenses"
                value={inputs.friction.movingExpenses}
                step={500}
                onChange={(val) => updateFriction('movingExpenses', val)}
                helpText="Packers, trucks, and layout changes."
              />

              <label className="grid gap-3 rounded-[1.5rem] border border-slate-800/80 bg-slate-950/45 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:border-slate-700/90 flex flex-col justify-between">
                <div>
                  <span className="text-sm font-semibold text-slate-100">First-Time Homebuyer status</span>
                  <p className="mt-1 text-xs text-slate-400">Can waive state transfer taxes in some jurisdictions.</p>
                </div>
                <label className="flex items-center space-x-3 cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={inputs.friction.isFirstTimeBuyer}
                    onChange={(e) => updateFriction('isFirstTimeBuyer', e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500/20"
                  />
                  <span className="text-xs text-slate-200">Yes, qualify for first-time buyer transfer exemption</span>
                </label>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 3. Market Sensitivity analysis dashboard */}
      <div className="rounded-[1.8rem] border border-slate-800 bg-slate-950/30 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-emerald-400">
              Sensitivity & Market Variables
            </p>
            <h3 className="mt-2 text-lg font-semibold text-white">
              Appreciation Rate Sensitivity Analysis
            </h3>
          </div>
          {/* Preset Buttons */}
          <div className="flex bg-slate-950 p-1 rounded-full border border-slate-800 space-x-1">
            <button
              onClick={() => handleSensitivityChange('low')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                sensitivityPreset === 'low'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Flat (1.5%)
            </button>
            <button
              onClick={() => handleSensitivityChange('base')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                sensitivityPreset === 'base'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Base (3.0%)
            </button>
            <button
              onClick={() => handleSensitivityChange('high')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                sensitivityPreset === 'high'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              High (5.5%)
            </button>
          </div>
        </div>

        {/* Custom Appreciation Slider */}
        <div className="mt-6 grid gap-4 md:grid-cols-2 items-center">
          <label className="grid gap-2">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>Custom Appreciation:</span>
              <span className="text-white font-semibold">{formatPercent(inputs.annualAppreciation * 100)}</span>
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
          <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 text-xs text-slate-400 leading-5">
            💡 **Rule of Thumb**: High-appreciation scenarios favor relocating (Move) as you get a larger absolute return on a bigger purchase price asset. Low-appreciation/flat markets favor improving (renovating) your current home due to high relocation transaction fees.
          </div>
        </div>
      </div>

      {/* 4. Outputs: Side-by-Side 5-Year Net Equity Ledger */}
      <div className="rounded-[1.8rem] border border-slate-800/90 bg-slate-900/45 p-6 shadow-2xl backdrop-blur-md">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-slate-400">5-Year Side-by-Side Ledger</p>
        
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
                <th className="py-3 px-2">Metric</th>
                <th className="py-3 px-2">Year 0 (Base)</th>
                <th className="py-3 px-2">Year 1</th>
                <th className="py-3 px-2">Year 3</th>
                <th className="py-3 px-2 text-right">Year 5 (Hold)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {/* Gross Property Value */}
              <tr className="bg-slate-950/20">
                <td className="py-3 px-2 font-semibold text-white">Gross Value (Improve)</td>
                <td className="py-3 px-2 tabular-nums">{formatCurrency(result.improvePathway[0].grossValue)}</td>
                <td className="py-3 px-2 tabular-nums">{formatCurrency(result.improvePathway[1].grossValue)}</td>
                <td className="py-3 px-2 tabular-nums">{formatCurrency(result.improvePathway[3].grossValue)}</td>
                <td className="py-3 px-2 tabular-nums text-right font-semibold text-emerald-400">{formatCurrency(result.improvePathway[5].grossValue)}</td>
              </tr>
              <tr className="text-slate-400">
                <td className="py-3 px-2">Gross Value (Move)</td>
                <td className="py-3 px-2 tabular-nums">{formatCurrency(result.movePathway[0].grossValue)}</td>
                <td className="py-3 px-2 tabular-nums">{formatCurrency(result.movePathway[1].grossValue)}</td>
                <td className="py-3 px-2 tabular-nums">{formatCurrency(result.movePathway[3].grossValue)}</td>
                <td className="py-3 px-2 tabular-nums text-right font-semibold text-cyan-400">{formatCurrency(result.movePathway[5].grossValue)}</td>
              </tr>

              {/* Outstanding Debt */}
              <tr className="bg-slate-950/20">
                <td className="py-3 px-2 font-semibold text-white">Debt (Improve)</td>
                <td className="py-3 px-2 tabular-nums text-rose-300/80">{formatCurrency(result.improvePathway[0].outstandingDebt)}</td>
                <td className="py-3 px-2 tabular-nums">{formatCurrency(result.improvePathway[1].outstandingDebt)}</td>
                <td className="py-3 px-2 tabular-nums">{formatCurrency(result.improvePathway[3].outstandingDebt)}</td>
                <td className="py-3 px-2 tabular-nums text-right font-semibold">{formatCurrency(result.improvePathway[5].outstandingDebt)}</td>
              </tr>
              <tr className="text-slate-400">
                <td className="py-3 px-2">Debt (Move)</td>
                <td className="py-3 px-2 tabular-nums text-rose-300/80">{formatCurrency(result.movePathway[0].outstandingDebt)}</td>
                <td className="py-3 px-2 tabular-nums">{formatCurrency(result.movePathway[1].outstandingDebt)}</td>
                <td className="py-3 px-2 tabular-nums">{formatCurrency(result.movePathway[3].outstandingDebt)}</td>
                <td className="py-3 px-2 tabular-nums text-right font-semibold">{formatCurrency(result.movePathway[5].outstandingDebt)}</td>
              </tr>

              {/* Net Equity */}
              <tr className="bg-emerald-500/5">
                <td className="py-3 px-2 font-bold text-white">Net Equity (Improve)</td>
                <td className="py-3 px-2 tabular-nums font-semibold">{formatCurrency(result.improvePathway[0].netEquity)}</td>
                <td className="py-3 px-2 tabular-nums font-semibold">{formatCurrency(result.improvePathway[1].netEquity)}</td>
                <td className="py-3 px-2 tabular-nums font-semibold">{formatCurrency(result.improvePathway[3].netEquity)}</td>
                <td className="py-3 px-2 tabular-nums text-right font-bold text-emerald-400">{formatCurrency(result.improvePathway[5].netEquity)}</td>
              </tr>
              <tr className="bg-cyan-500/5">
                <td className="py-3 px-2 font-bold text-white">Net Equity (Move)</td>
                <td className="py-3 px-2 tabular-nums font-semibold">{formatCurrency(result.movePathway[0].netEquity)}</td>
                <td className="py-3 px-2 tabular-nums font-semibold">{formatCurrency(result.movePathway[1].netEquity)}</td>
                <td className="py-3 px-2 tabular-nums font-semibold">{formatCurrency(result.movePathway[3].netEquity)}</td>
                <td className="py-3 px-2 tabular-nums text-right font-bold text-cyan-400">{formatCurrency(result.movePathway[5].netEquity)}</td>
              </tr>

              {/* Cumulative Payments */}
              <tr className="bg-slate-950/20">
                <td className="py-3 px-2 font-semibold text-white">Cum. Payments (Improve)</td>
                <td className="py-3 px-2 tabular-nums">$0</td>
                <td className="py-3 px-2 tabular-nums">{formatCurrency(result.improvePathway[1].cumulativePayments)}</td>
                <td className="py-3 px-2 tabular-nums">{formatCurrency(result.improvePathway[3].cumulativePayments)}</td>
                <td className="py-3 px-2 tabular-nums text-right font-semibold">{formatCurrency(result.improvePathway[5].cumulativePayments)}</td>
              </tr>
              <tr className="text-slate-400">
                <td className="py-3 px-2">Cum. Payments (Move)</td>
                <td className="py-3 px-2 tabular-nums">{formatCurrency(result.movePathway[0].cumulativePayments)}</td>
                <td className="py-3 px-2 tabular-nums">{formatCurrency(result.movePathway[1].cumulativePayments)}</td>
                <td className="py-3 px-2 tabular-nums">{formatCurrency(result.movePathway[3].cumulativePayments)}</td>
                <td className="py-3 px-2 tabular-nums text-right font-semibold">{formatCurrency(result.movePathway[5].cumulativePayments)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Local Friction details note */}
        <div className="mt-6 border-t border-slate-800 pt-5 grid gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <span className="font-mono text-slate-500 uppercase tracking-wider block">Relocation Transfer Tax</span>
            <span className="mt-1 block text-sm font-semibold text-slate-200 tabular-nums">
              {formatCurrency(result.taxDetails.transferTax)}
            </span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <span className="font-mono text-slate-500 uppercase tracking-wider block">County Recordation Tax</span>
            <span className="mt-1 block text-sm font-semibold text-slate-200 tabular-nums">
              {formatCurrency(result.taxDetails.recordationTax)}
            </span>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
            <span className="font-mono text-slate-500 uppercase tracking-wider block">Exemptions Applied</span>
            <span className={`mt-1 block text-xs font-semibold ${result.taxDetails.statutoryExemptionApplied ? 'text-emerald-400' : 'text-slate-400'}`}>
              {result.taxDetails.statutoryExemptionApplied ? 'Montgomery County Exemption Applied' : 'No Local Exemptions'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
