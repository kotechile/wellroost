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
    isSecondStory: false,
    isAddition: false,
    currentSqft: 2000,
    addedSqft: 0
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
      <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] font-semibold text-emerald-800">
              Your 5-Year Projection
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-1000 sm:text-4xl">
              {improveIsBetter
                ? `Renovating Wins by ${formatCurrency(variance)}`
                : `Moving Wins by ${formatCurrency(variance)}`}
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-600">
              {improveIsBetter ? (
                <>
                  If you stay and renovate, you're projected to have{' '}
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(variance)} more
                  </span>{' '}
                  in home equity after 5 years compared to selling and buying a new place.
                </>
              ) : (
                <>
                  If you sell and buy a new home, you're projected to have{' '}
                  <span className="font-bold text-blue-700">
                    {formatCurrency(variance)} more
                  </span>{' '}
                  in home equity after 5 years, even after commissions and closing costs.
                </>
              )}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.24em] font-medium text-gray-700 shadow-xs">
                Holding Period: 60 Months
              </span>
              <span className="rounded-full border border-gray-200 bg-white px-3.5 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.24em] font-medium text-gray-700 shadow-xs">
                ZIP: {inputs.friction.zipCode}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 bg-white/95 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] font-medium text-gray-500">
                The Difference (Year 5)
              </p>
              <h3 className={`mt-2 text-4xl font-bold tracking-tight tabular-nums ${improveIsBetter ? 'text-emerald-700' : 'text-blue-700'}`}>
                {formatCurrency(variance)}
              </h3>
              <p className="mt-2 text-xs leading-5 text-gray-500">
                {improveIsBetter
                  ? 'Renovating outperforms moving after all transaction costs, interest, and remodeling overruns.'
                  : 'Moving builds higher equity despite commissions and transfer taxes.'}
              </p>
            </div>

            <div className="mt-6 border-t border-gray-200 pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] font-medium text-gray-500">
                  Equity if You Renovate
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900 tabular-nums">
                  {formatCurrency(improveEquityYear5)}
                </p>
              </div>
              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] font-medium text-gray-500">
                  Equity if You Move
                </p>
                <p className="mt-1 text-lg font-bold text-gray-900 tabular-nums">
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
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Tab Buttons */}
        <div className="flex border-b border-gray-200 pb-4">
          <nav className="flex flex-wrap gap-2" aria-label="Calculator steps">
            <button
              onClick={() => setActiveTab('current')}
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'current'
                  ? 'bg-emerald-700 border border-emerald-700 text-white shadow-xs'
                  : 'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              1 · Your Home
            </button>
            <button
              onClick={() => setActiveTab('improve')}
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'improve'
                  ? 'bg-emerald-700 border border-emerald-700 text-white shadow-xs'
                  : 'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              2 · Renovation
            </button>
            <button
              onClick={() => setActiveTab('move')}
              className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'move'
                  ? 'bg-emerald-700 border border-emerald-700 text-white shadow-xs'
                  : 'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              3 · Relocation
            </button>
          </nav>
        </div>

        {/* Tab description */}
        <p className="mt-4 text-sm text-gray-600 leading-6">
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
            <label className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-xs hover:border-gray-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">Your current mortgage rate</span>
                <span className="font-mono text-sm font-bold text-emerald-700">{formatPercent(Number((inputs.legacyDebt.interestRate * 100).toFixed(2)))}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.12"
                step="0.001"
                value={inputs.legacyDebt.interestRate}
                onChange={(e) => updateLegacyDebt('interestRate', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <p className="text-xs leading-5 text-gray-500">The low locked rate you'd give up if you sell.</p>
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
            <div className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50/50 p-5">
              <span className="text-sm font-semibold text-gray-900">What kind of project?</span>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {PROJECT_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateRenovation('projectType', option.value)}
                    className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                      inputs.renovation.projectType === option.value
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{option.label}</div>
                    <div className="mt-1 flex justify-between text-gray-500">
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

              <label className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-xs hover:border-gray-300 transition">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Budget buffer for overruns</span>
                  <span className="font-mono text-sm font-bold text-emerald-700">+{formatPercent(Number((inputs.renovation.overrunRate * 100).toFixed(2)))}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.5"
                  step="0.05"
                  value={inputs.renovation.overrunRate}
                  onChange={(e) => updateRenovation('overrunRate', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <p className="text-xs leading-5 text-gray-500">Extra margin for unexpected cost spikes (10–15% is typical).</p>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-sm font-semibold text-gray-900">Additional scope</span>
                  <p className="mt-1 text-xs text-gray-500">These options change the projected cost and ROI.</p>
                </div>
                <div className="mt-4 space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inputs.renovation.addBedBath}
                      onChange={(e) => updateRenovation('addBedBath', e.target.checked)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/20"
                    />
                    <span className="text-xs text-gray-700">Adding a bedroom or bathroom (+20% ROI lift)</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inputs.renovation.isSecondStory}
                      onChange={(e) => updateRenovation('isSecondStory', e.target.checked)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/20"
                    />
                    <span className="text-xs text-gray-700">Second-story addition (+50% cost, 6 months temp rent)</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inputs.renovation.isAddition}
                      onChange={(e) => updateRenovation('isAddition', e.target.checked)}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/20"
                    />
                    <span className="text-xs text-gray-700">This includes a physical addition (adding square footage)</span>
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-sm font-semibold text-gray-900">How you'll pay for it</span>
                  <p className="mt-1 text-xs text-gray-500">Assumes a standard renovation loan.</p>
                </div>
                <div className="mt-4 p-3.5 bg-white rounded-xl border border-gray-200">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Funding Type:</span>
                    <span className="text-gray-900 font-semibold">Renovation HELOC</span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-gray-600">
                    <span>HELOC Rate:</span>
                    <span className="text-gray-900 font-bold">{formatPercent(Number(((inputs.newMortgageRate + 0.01) * 100).toFixed(2)))}</span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-gray-600">
                    <span>HELOC Term:</span>
                    <span className="text-gray-900 font-bold">180 Months (15 Yrs)</span>
                  </div>
                </div>
              </div>
            </div>

            {inputs.renovation.isAddition && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 grid gap-4 md:grid-cols-2 shadow-xs">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Addition Footprint Details</h4>
                  <p className="mt-1 text-xs text-gray-500">Values are scaled using local comps per square foot.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="text-xs text-gray-600 font-medium">Current Home Size (sqft)</span>
                    <input
                      type="number"
                      min="500"
                      max="15000"
                      step="100"
                      value={inputs.renovation.currentSqft}
                      onChange={(e) => updateRenovation('currentSqft', parseInt(e.target.value) || 0)}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900 focus:border-emerald-600 outline-none"
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs text-gray-600 font-medium">Addition Size (sqft)</span>
                    <input
                      type="number"
                      min="0"
                      max="5000"
                      step="50"
                      value={inputs.renovation.addedSqft}
                      onChange={(e) => updateRenovation('addedSqft', parseInt(e.target.value) || 0)}
                      className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900 focus:border-emerald-600 outline-none"
                    />
                  </label>
                </div>
                {inputs.renovation.currentSqft > 0 && inputs.renovation.addedSqft > 0 && (
                  <div className="md:col-span-2 text-xs text-emerald-800 font-semibold bg-emerald-100/70 p-2.5 rounded-xl border border-emerald-300">
                    (+{((inputs.renovation.addedSqft / inputs.renovation.currentSqft) * 100).toFixed(0)}% space added to your home footprint)
                  </div>
                )}
              </div>
            )}
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

              <label className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-xs hover:border-gray-300 transition">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">New mortgage interest rate</span>
                  <span className="font-mono text-sm font-bold text-blue-700">{formatPercent(Number((inputs.newMortgageRate * 100).toFixed(2)))}</span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.12"
                  step="0.001"
                  value={inputs.newMortgageRate}
                  onChange={(e) => updateInput('newMortgageRate', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs leading-5 text-gray-500">Today's prevailing mortgage rates for new loans.</p>
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <label className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-xs hover:border-gray-300 transition">
                <span className="text-sm font-semibold text-gray-900">Your ZIP Code</span>
                <input
                  type="text"
                  value={inputs.friction.zipCode}
                  onChange={(e) => updateFriction('zipCode', e.target.value)}
                  placeholder="20814"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 focus:border-blue-600 outline-none"
                />
                <p className="text-xs leading-5 text-gray-500">Used to estimate local transfer taxes and recording fees (default: Montgomery County, MD).</p>
              </label>

              <label className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-xs hover:border-gray-300 transition">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Broker commissions</span>
                  <span className="font-mono text-xs font-bold text-blue-700">{formatPercent(Number((inputs.friction.brokerCommissionRate * 100).toFixed(2)))}</span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.08"
                  step="0.005"
                  value={inputs.friction.brokerCommissionRate}
                  onChange={(e) => updateFriction('brokerCommissionRate', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs leading-5 text-gray-500">Total seller-side agent commissions.</p>
              </label>

              <label className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-xs hover:border-gray-300 transition">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Closing costs</span>
                  <span className="font-mono text-xs font-bold text-blue-700">{formatPercent(Number((inputs.friction.buyerClosingCostRate * 100).toFixed(2)))}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.06"
                  step="0.005"
                  value={inputs.friction.buyerClosingCostRate}
                  onChange={(e) => updateFriction('buyerClosingCostRate', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs leading-5 text-gray-500">Buyer-side fees (lender, escrow, title).</p>
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

              <label className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 shadow-xs hover:border-gray-300 transition flex flex-col justify-between">
                <div>
                  <span className="text-sm font-semibold text-gray-900">First-time homebuyer?</span>
                  <p className="mt-1 text-xs text-gray-500">May waive transfer taxes in some jurisdictions.</p>
                </div>
                <label className="flex items-center space-x-3 cursor-pointer mt-3">
                  <input
                    type="checkbox"
                    checked={inputs.friction.isFirstTimeBuyer}
                    onChange={(e) => updateFriction('isFirstTimeBuyer', e.target.checked)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/20"
                  />
                  <span className="text-xs text-gray-700">Yes, I qualify for the first-time buyer exemption</span>
                </label>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* ============================================================ */}
      {/* 3. SENSITIVITY — "What if home prices change?"               */}
      {/* ============================================================ */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] font-semibold text-emerald-800">
              Market Scenario
            </p>
            <h3 className="mt-2 text-lg font-bold text-gray-1000">
              What if home prices change?
            </h3>
          </div>
          {/* Preset Buttons */}
          <div className="flex bg-white p-1 rounded-full border border-gray-200 space-x-1 shadow-xs">
            <button
              onClick={() => handleSensitivityChange('low')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition cursor-pointer ${
                sensitivityPreset === 'low'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Flat (1.5%)
            </button>
            <button
              onClick={() => handleSensitivityChange('base')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition cursor-pointer ${
                sensitivityPreset === 'base'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Base (3.0%)
            </button>
            <button
              onClick={() => handleSensitivityChange('high')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition cursor-pointer ${
                sensitivityPreset === 'high'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              High (5.5%)
            </button>
          </div>
        </div>

        {/* Custom Appreciation Slider */}
        <div className="mt-6 grid gap-4 md:grid-cols-2 items-center">
          <label className="grid gap-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="font-semibold text-gray-700">Annual home price growth:</span>
              <span className="text-emerald-700 font-bold">{formatPercent(Number((inputs.annualAppreciation * 100).toFixed(2)))}</span>
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
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
          </label>
          <div className="p-3.5 bg-white rounded-xl border border-gray-200 text-xs text-gray-600 leading-relaxed shadow-xs">
            <span className="inline-flex items-center gap-1.5 text-amber-800 font-semibold mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6c0 1.56.806 2.933 2.024 3.726a.75.75 0 0 1 .351.636v1.888h4.25V10.36a.75.75 0 0 1 .352-.637A4.5 4.5 0 0 0 8 1.5ZM5.75 13.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z" />
              </svg>
              Rule of Thumb
            </span>
            <p>
              High-appreciation markets tend to favor <strong className="text-gray-900 font-semibold">moving</strong> (larger asset base = bigger absolute gains). Flat or slow markets favor <strong className="text-gray-900 font-semibold">renovating</strong> (transaction fees eat into the move).
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. LEDGER — "Your 5-Year Comparison"                         */}
      {/* ============================================================ */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <p className="font-mono text-xs uppercase tracking-[0.28em] font-semibold text-gray-900">Your 5-Year Comparison</p>
          {/* Color Legend */}
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              Renovate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              Move
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-mono bg-gray-50">
                <th className="py-3 px-3 font-semibold">Metric</th>
                <th className="py-3 px-3 font-semibold">Year 0</th>
                <th className="py-3 px-3 font-semibold">Year 1</th>
                <th className="py-3 px-3 font-semibold">Year 3</th>
                <th className="py-3 px-3 font-semibold">Year 5</th>
                <th className="py-3 px-3 text-right font-semibold">5-Year Total Sum</th>
              </tr>
            </thead>
            <tbody className="font-medium text-gray-900">
              {/* ——— Home Value Group ——— */}
              <tr className="border-t-2 border-gray-200 bg-gray-100/80">
                <td colSpan={6} className="py-2 px-3 text-[0.7rem] font-mono uppercase tracking-widest text-gray-800 font-bold">Home Value</td>
              </tr>
              <tr className="bg-white hover:bg-gray-50/60 border-b border-gray-100">
                <td className="py-3.5 px-3 font-semibold"><span className="text-emerald-700 font-bold mr-1.5">Renovate:</span>Home Value</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.improvePathway[0].grossValue)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.improvePathway[1].grossValue)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.improvePathway[3].grossValue)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.improvePathway[5].grossValue)}</td>
                <td className="py-3.5 px-3 tabular-nums text-right text-gray-400">—</td>
              </tr>
              <tr className="bg-gray-50/40 hover:bg-gray-50/70 border-b border-gray-100">
                <td className="py-3.5 px-3 font-semibold"><span className="text-blue-700 font-bold mr-1.5">Move:</span>Home Value</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[0].grossValue)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[1].grossValue)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[3].grossValue)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[5].grossValue)}</td>
                <td className="py-3.5 px-3 tabular-nums text-right text-gray-400">—</td>
              </tr>

              {/* ——— Debt Group ——— */}
              <tr className="border-t-2 border-gray-200 bg-gray-100/80">
                <td colSpan={6} className="py-2 px-3 text-[0.7rem] font-mono uppercase tracking-widest text-gray-800 font-bold">What You Owe</td>
              </tr>
              <tr className="bg-white hover:bg-gray-50/60 border-b border-gray-100">
                <td className="py-3.5 px-3 font-semibold"><span className="text-emerald-700 font-bold mr-1.5">Renovate:</span>Debt</td>
                <td className="py-3.5 px-3 tabular-nums text-rose-600 font-semibold">{formatCurrency(result.improvePathway[0].outstandingDebt)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.improvePathway[1].outstandingDebt)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.improvePathway[3].outstandingDebt)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.improvePathway[5].outstandingDebt)}</td>
                <td className="py-3.5 px-3 tabular-nums text-right text-gray-400">—</td>
              </tr>
              <tr className="bg-gray-50/40 hover:bg-gray-50/70 border-b border-gray-100">
                <td className="py-3.5 px-3 font-semibold"><span className="text-blue-700 font-bold mr-1.5">Move:</span>Debt</td>
                <td className="py-3.5 px-3 tabular-nums text-rose-600 font-semibold">{formatCurrency(result.movePathway[0].outstandingDebt)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[1].outstandingDebt)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[3].outstandingDebt)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[5].outstandingDebt)}</td>
                <td className="py-3.5 px-3 tabular-nums text-right text-gray-400">—</td>
              </tr>

              {/* ——— Net Equity Group (hero rows) ——— */}
              <tr className="border-t-2 border-gray-200 bg-gray-100/80">
                <td colSpan={6} className="py-2 px-3 text-[0.7rem] font-mono uppercase tracking-widest text-gray-800 font-bold">Net Equity (Value − Debt)</td>
              </tr>
              <tr className="bg-emerald-50/90 border-y border-emerald-200">
                <td className="py-3.5 px-3 font-bold"><span className="text-emerald-800 font-bold mr-1.5">Renovate:</span>Net Equity</td>
                <td className="py-3.5 px-3 tabular-nums font-semibold text-emerald-950">{formatCurrency(result.improvePathway[0].netEquity)}</td>
                <td className="py-3.5 px-3 tabular-nums font-semibold text-emerald-950">{formatCurrency(result.improvePathway[1].netEquity)}</td>
                <td className="py-3.5 px-3 tabular-nums font-semibold text-emerald-950">{formatCurrency(result.improvePathway[3].netEquity)}</td>
                <td className="py-3.5 px-3 tabular-nums text-emerald-800 font-extrabold">{formatCurrency(result.improvePathway[5].netEquity)}</td>
                <td className="py-3.5 px-3 tabular-nums text-right text-gray-400">—</td>
              </tr>
              <tr className="bg-blue-50/90 border-y border-blue-200">
                <td className="py-3.5 px-3 font-bold"><span className="text-blue-800 font-bold mr-1.5">Move:</span>Net Equity</td>
                <td className="py-3.5 px-3 tabular-nums font-semibold text-blue-950">{formatCurrency(result.movePathway[0].netEquity)}</td>
                <td className="py-3.5 px-3 tabular-nums font-semibold text-blue-950">{formatCurrency(result.movePathway[1].netEquity)}</td>
                <td className="py-3.5 px-3 tabular-nums font-semibold text-blue-950">{formatCurrency(result.movePathway[3].netEquity)}</td>
                <td className="py-3.5 px-3 tabular-nums text-blue-800 font-extrabold">{formatCurrency(result.movePathway[5].netEquity)}</td>
                <td className="py-3.5 px-3 tabular-nums text-right text-gray-400">—</td>
              </tr>

              {/* ——— Out-of-Pocket Cash Spent Group ——— */}
              <tr className="border-t-2 border-gray-200 bg-gray-100/80">
                <td colSpan={6} className="py-2 px-3 text-[0.7rem] font-mono uppercase tracking-widest text-gray-800 font-bold">OUT-OF-POCKET CASH SPENT (PER YEAR)</td>
              </tr>
              <tr className="bg-white hover:bg-gray-50/60 border-b border-gray-100">
                <td className="py-3.5 px-3 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-700 font-bold">Renovate:</span>
                    <span>Out-of-pocket</span>
                    <span 
                      className="inline-flex cursor-help text-gray-400 hover:text-gray-700 transition"
                      title="Year 0: $0 (HELOC funding covers quote + permits). Years 1–5: 12 months of your current mortgage payment + the new renovation HELOC payment (+ temporary rental costs, if applicable)."
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                        <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 7.25a.75.75 0 0 0 0 1.5h.75v3a.75.75 0 0 0 1.5 0v-3.75a.75.75 0 0 0-.75-.75h-1.5Z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.improvePathway[0].yearlySpent)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.improvePathway[1].yearlySpent)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.improvePathway[3].yearlySpent)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.improvePathway[5].yearlySpent)}</td>
                <td className="py-3.5 px-3 tabular-nums text-right font-bold text-sm text-emerald-800 bg-emerald-100 border border-emerald-300 rounded px-2.5 py-1">{formatCurrency(result.variance.fiveYearTotalImprove)}</td>
              </tr>
              <tr className="bg-gray-50/40 hover:bg-gray-50/70">
                <td className="py-3.5 px-3 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-700 font-bold">Move:</span>
                    <span>Out-of-pocket</span>
                    <span 
                      className="inline-flex cursor-help text-gray-400 hover:text-gray-700 transition"
                      title="Year 0: Upfront selling friction (broker commission, transfer taxes, moving expenses) + recordation fees on the new loan. Years 1–5: 12 months of new mortgage payments."
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                        <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 7.25a.75.75 0 0 0 0 1.5h.75v3a.75.75 0 0 0 1.5 0v-3.75a.75.75 0 0 0-.75-.75h-1.5Z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[0].yearlySpent)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[1].yearlySpent)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[3].yearlySpent)}</td>
                <td className="py-3.5 px-3 tabular-nums">{formatCurrency(result.movePathway[5].yearlySpent)}</td>
                <td className="py-3.5 px-3 tabular-nums text-right font-bold text-sm text-blue-800 bg-blue-100 border border-blue-300 rounded px-2.5 py-1">{formatCurrency(result.variance.fiveYearTotalMove)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ——— OUT-OF-POCKET EXPLANATION GUIDE ——— */}
        <div className="mt-5 p-5 rounded-2xl border border-gray-200 bg-gray-50/70 grid gap-5 md:grid-cols-2 text-xs leading-6 text-gray-600">
          <div>
            <span className="font-bold text-emerald-800 flex items-center gap-1.5 mb-2 font-mono uppercase tracking-wider text-[0.7rem]">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-600"></span>
              Renovate Out-of-Pocket Breakdown
            </span>
            <p>
              <strong className="text-gray-900">Year 0 ($0):</strong> Upfront construction and permit fees are fully covered by the HELOC loan, requiring $0 initial out-of-pocket cash.
            </p>
            <p className="mt-2">
              <strong className="text-gray-900">Years 1–5 (Ongoing):</strong> Consists of 12 months of your primary legacy mortgage payments plus the new HELOC loan payments (plus temporary rent in Year 1 if a second-story addition is selected).
            </p>
          </div>
          <div className="border-t border-gray-200 pt-4 md:border-t-0 md:pt-0 md:border-l md:border-gray-200 md:pl-5">
            <span className="font-bold text-blue-800 flex items-center gap-1.5 mb-2 font-mono uppercase tracking-wider text-[0.7rem]">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-600"></span>
              Move Out-of-Pocket Breakdown
            </span>
            <p>
              <strong className="text-gray-900">Year 0 (Upfront fees):</strong> Selling friction transaction fees (broker commissions, transfer taxes, physical moving expenses) plus recordation taxes for the new property mortgage.
            </p>
            <p className="mt-2">
              <strong className="text-gray-900">Years 1–5 (Ongoing):</strong> Consists of 12 months of mortgage payments on your new loan (based on the new purchase rate and loan balance).
            </p>
          </div>
        </div>

        {/* ——— BOTTOM-LINE SUMMARY ——— */}
        <div className={`mt-6 rounded-2xl p-5 border ${
          improveIsBetter
            ? 'border-emerald-200 bg-emerald-50/80'
            : 'border-blue-200 bg-blue-50/80'
        }`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">{improveIsBetter ? '🏠' : '🚚'}</span>
            <div className="text-sm leading-7 text-gray-700">
              {improveIsBetter ? (
                <>
                  <strong className="text-emerald-950 font-bold">Bottom line: Staying and renovating</strong> is projected to leave you with{' '}
                  <strong className="text-gray-900 font-bold">{formatCurrency(improveEquityYear5)}</strong> in equity after 5 years — that's{' '}
                  <strong className="text-emerald-800 font-bold">{formatCurrency(variance)} more</strong> than if you sold and bought a new home.
                  You'd pay <strong className="text-gray-900 font-bold">{formatCurrency(result.variance.fiveYearTotalImprove)}</strong> total over 60 months in mortgage and HELOC payments, but your home's value grows to{' '}
                  <strong className="text-gray-900 font-bold">{formatCurrency(result.improvePathway[5].grossValue)}</strong>.
                </>
              ) : (
                <>
                  <strong className="text-blue-950 font-bold">Bottom line: Selling and buying a new home</strong> is projected to leave you with{' '}
                  <strong className="text-gray-900 font-bold">{formatCurrency(moveEquityYear5)}</strong> in equity after 5 years — that's{' '}
                  <strong className="text-blue-800 font-bold">{formatCurrency(variance)} more</strong> than if you stayed and renovated, even after broker commissions, transfer taxes, and closing costs.
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tax Detail Cards */}
        <div className="mt-6 border-t border-gray-200 pt-5 grid gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
            <span className="font-mono text-gray-500 uppercase tracking-wider block font-medium">State Transfer Tax</span>
            <span className="mt-1 block text-sm font-bold text-gray-900 tabular-nums">
              {formatCurrency(result.taxDetails.transferTax)}
            </span>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
            <span className="font-mono text-gray-500 uppercase tracking-wider block font-medium">Recording Fees</span>
            <span className="mt-1 block text-sm font-bold text-gray-900 tabular-nums">
              {formatCurrency(result.taxDetails.recordationTax)}
            </span>
          </div>
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
            <span className="font-mono text-gray-500 uppercase tracking-wider block font-medium">Tax Exemptions</span>
            <span className={`mt-1 block text-xs font-bold ${result.taxDetails.statutoryExemptionApplied ? 'text-emerald-700' : 'text-gray-600'}`}>
              {result.taxDetails.statutoryExemptionApplied ? 'Montgomery County Exemption Applied' : 'No Local Exemptions'}
            </span>
          </div>
        </div>

        {/* Collapsible Accordion for Calculation Logic */}
        <div className="mt-6 border-t border-gray-200 pt-5">
          <button
            onClick={() => setShowLogic(!showLogic)}
            className="flex items-center justify-between w-full py-2 text-xs font-mono uppercase tracking-wider text-gray-600 hover:text-gray-900 transition focus:outline-none cursor-pointer"
          >
            <span className="font-semibold">{showLogic ? '▼' : '▶'} How we calculated this</span>
            <span className="text-gray-500 text-[10px] font-medium">{showLogic ? 'Collapse' : 'Expand'}</span>
          </button>

          {showLogic && (
            <div className="mt-4 p-5 rounded-2xl border border-gray-200 bg-gray-50 font-sans text-xs leading-6 text-gray-700 space-y-4">
              <p className="text-gray-500 text-[11px]">
                Here's the math behind your projection, broken into the two pathways.
              </p>
              <div>
                <h4 className="font-bold text-gray-900 text-sm mb-2">1. Renovation Pathway</h4>
                <p>Models your home's future value based on your renovation cost and its expected ROI, compounded over time with annual appreciation.</p>
                <div className="mt-2 font-mono text-[11px] bg-white p-3 rounded-lg border border-gray-200 text-emerald-800">
                  Home Value(y) = (Current Value + Quote × ROI) × (1 + Growth)^y<br />
                  Net Equity(5) = Home Value(5) − Mortgage Balance(60) − HELOC Balance(60)
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm mb-2">2. Relocation Pathway</h4>
                <p>Models selling your current property, paying localized transaction taxes and commissions, and purchasing a new asset with a new market-rate loan.</p>
                <div className="mt-2 font-mono text-[11px] bg-white p-3 rounded-lg border border-gray-200 text-blue-800">
                  Home Value(y) = New Purchase Price × (1 + Growth)^y<br />
                  Net Equity(5) = Home Value(5) − New Mortgage Balance(60)
                </div>
              </div>
              <div className="text-gray-500 text-[10px] border-t border-gray-200 pt-3">
                * The engine calculates full amortization schedules for legacy mortgage, HELOC, and new relocation loan over a 60-month holding period using standard fixed-rate amortization formulas.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
