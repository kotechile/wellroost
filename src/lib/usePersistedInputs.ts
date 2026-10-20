/**
 * Persist a calculator's inputs so a returning visitor does not re-enter ten fields.
 *
 * Rules that matter:
 * - Restore in an effect, never during render. The site is statically built, so reading localStorage
 *   during render produces a hydration mismatch (server HTML says default, client says remembered).
 * - Only keys the current schema knows about are restored. An old snapshot from before a field was
 *   renamed must not inject unknown keys into the engine.
 * - A restore is announced, not silent. Quietly changing the numbers a visitor last saw — especially
 *   financial ones — reads as a bug; the notice offers "Start fresh".
 * - Versioned key. Bump `version` when input semantics change, and old snapshots are ignored.
 *
 * Scope: full multivariable engines. A quick preview card should reset — remembering two fields is
 * not worth the surprise.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_PREFIX = 'wr:model:';

export interface PersistenceOptions {
	/** Top-level keys that may be restored. Anything else in the snapshot is dropped. */
	allowedKeys: string[];
	version?: number;
}

export function usePersistedInputs<T extends object>(
	key: string,
	initial: T,
	{ allowedKeys, version = 1 }: PersistenceOptions
) {
	const storageKey = `${STORAGE_PREFIX}${key}:v${version}`;
	const [value, setValue] = useState<T>(initial);
	const [restored, setRestored] = useState(false);

	// The first persistence run belongs to the restore; writing there would overwrite the snapshot
	// with defaults before the restored state has been applied.
	const restoredRef = useRef(false);
	const skipFirstWrite = useRef(true);
	// Set by reset(): without it the persist effect fires on the reset state change and immediately
	// writes the defaults back, so "Start fresh" would leave a snapshot behind anyway.
	const suppressWrite = useRef(false);

	useEffect(() => {
		let parsed: { data?: Record<string, unknown>; savedAt?: string } | null = null;
		try {
			const raw = window.localStorage.getItem(storageKey);
			if (raw) parsed = JSON.parse(raw);
		} catch {
			parsed = null;
		}

		const data = parsed?.data;
		if (data && typeof data === 'object') {
			const next: Record<string, unknown> = { ...(initial as Record<string, unknown>) };
			let changed = false;
			for (const field of allowedKeys) {
				if (Object.prototype.hasOwnProperty.call(data, field)) {
					next[field] = data[field];
					changed = true;
				}
			}
			if (changed) {
				setValue(next as T);
				setRestored(true);
			}
		}
		restoredRef.current = true;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [storageKey]);

	useEffect(() => {
		if (skipFirstWrite.current) {
			skipFirstWrite.current = false;
			return;
		}
		if (suppressWrite.current) {
			suppressWrite.current = false;
			return;
		}
		if (!restoredRef.current) return;
		try {
			window.localStorage.setItem(storageKey, JSON.stringify({ data: value, savedAt: new Date().toISOString() }));
		} catch {
			// Private mode / quota. Losing persistence is acceptable; breaking the engine is not.
		}
	}, [value, storageKey]);

	const reset = useCallback(() => {
		suppressWrite.current = true;
		try {
			window.localStorage.removeItem(storageKey);
		} catch {
			/* ignore */
		}
		setValue(initial);
		setRestored(false);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [storageKey]);

	return { value, setValue, restored, reset, dismissRestored: () => setRestored(false) };
}
