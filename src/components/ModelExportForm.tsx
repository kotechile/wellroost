import React, { useState } from 'react';
import { isLeadCaptureConfigured, submitScenarioEmail } from '../lib/leads';

/**
 * Optional "email me this scenario" — never a gate.
 *
 * The model above is complete and exportable without touching this form. It exists because some
 * visitors want the numbers in their inbox, and an email they chose to give is a far better signal
 * than any click event. The consent line under the button states the one purpose; the privacy page
 * is one click away.
 *
 * When no sink is configured the form says so instead of pretending to send. A "Report sent" label
 * for a request that went nowhere is the worst outcome available here.
 */
export interface ModelExportFormProps {
	assetSlug: string;
	assetTitle: string;
	/** The scenario the visitor is asking to be sent: their inputs plus the computed output. */
	scenario: Record<string, unknown>;
	/** Copy for the submit button, e.g. "Email me this underwriting packet". */
	label?: string;
	/**
	 * Fired once the request is accepted. The PARENT owns telemetry for this asset — registering a
	 * second hook here would emit a phantom `view` for a pseudo-asset on every mount and skew the
	 * funnel the hook exists to measure.
	 */
	onSent?: (metadata: Record<string, unknown>) => void;
}

type Status = 'idle' | 'sending' | 'sent' | 'error' | 'not_configured';

export const ModelExportForm: React.FC<ModelExportFormProps> = ({
	assetSlug,
	assetTitle,
	scenario,
	label = 'Email me this scenario',
	onSent
}) => {
	const [email, setEmail] = useState('');
	const [status, setStatus] = useState<Status>(isLeadCaptureConfigured() ? 'idle' : 'not_configured');
	const [message, setMessage] = useState('');

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (status === 'sending') return;

		setStatus('sending');
		setMessage('');

		const result = await submitScenarioEmail({ email, assetSlug, assetTitle, scenario });

		if (result.ok) {
			setStatus('sent');
			setMessage(`Sent to ${email.trim()}. It should arrive within a minute.`);
			onSent?.({ action: 'email_scenario', asset: assetSlug });
			return;
		}

		if (result.reason === 'invalid_email') {
			setStatus('error');
			setMessage('That address does not look complete. Check it and try again.');
			return;
		}
		if (result.reason === 'not_configured') {
			setStatus('not_configured');
			return;
		}
		setStatus('error');
		setMessage('The send failed on our side. Your model is unchanged — use Copy above and it is yours.');
	};

	if (status === 'not_configured') {
		return (
			<div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
				<p className="text-xs leading-5 text-gray-600">
					<span className="font-semibold text-gray-800">Email delivery is not configured on this build.</span> The
					model and the copy action work; nothing is being collected here. Use{' '}
					<span className="font-mono">Copy underwriting packet</span> to keep your numbers.
				</p>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4">
			<label htmlFor={`${assetSlug}-email`} className="font-mono text-[0.65rem] font-semibold uppercase tracking-wider text-gray-500">
				Send this scenario to your inbox
			</label>
			<div className="mt-2 flex flex-col gap-2 sm:flex-row">
				<input
					id={`${assetSlug}-email`}
					type="email"
					name="email"
					required
					autoComplete="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					placeholder="you@company.com"
					className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				/>
				<button
					type="submit"
					disabled={status === 'sending' || status === 'sent'}
					className="shrink-0 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
				>
					{status === 'sending' ? 'Sending…' : status === 'sent' ? 'Sent' : label}
				</button>
			</div>
			<p className="mt-2 text-[0.7rem] leading-5 text-gray-500">
				We will only use your email to send this scenario report. You can unsubscribe at any time. See{' '}
				<a href="/privacy/" className="underline underline-offset-2 hover:text-gray-700">
					Privacy
				</a>
				.
			</p>
			{message && (
				<p
					aria-live="polite"
					className={`mt-2 text-xs ${status === 'error' ? 'text-red-700' : 'text-emerald-700'}`}
				>
					{message}
				</p>
			)}
		</form>
	);
};

export default ModelExportForm;
