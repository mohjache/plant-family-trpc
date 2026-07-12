"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

/** The display state of a page-supplied primary action for the bottom bar. */
type BottomBarDisplay = {
	label: string;
	disabled?: boolean;
	loading?: boolean;
};

/** The full action a page registers, including the callback to run on press. */
export type BottomBarAction = BottomBarDisplay & {
	onClick: () => void;
};

type BottomBarContextValue = {
	action: BottomBarDisplay | null;
	onClickRef: React.MutableRefObject<() => void>;
	publish: (display: BottomBarDisplay) => void;
	clear: () => void;
};

const BottomBarContext = createContext<BottomBarContextValue | null>(null);

/**
 * Provides a slot the {@link BottomNav} can render into. When a page registers
 * an action (via {@link useBottomBarAction}) the nav swaps its tabs for that
 * single full-width action, keeping the fixed bottom bar contextual to the task
 * at hand instead of offering navigation that would discard in-progress work.
 */
export function BottomBarProvider({ children }: { children: React.ReactNode }) {
	const [action, setAction] = useState<BottomBarDisplay | null>(null);
	const onClickRef = useRef<() => void>(() => {});

	// Stable identities so `useBottomBarAction`'s effect doesn't re-run (and loop)
	// every time the published action state changes.
	const publish = useCallback((display: BottomBarDisplay) => {
		setAction(display);
	}, []);
	const clear = useCallback(() => setAction(null), []);

	const value = useMemo<BottomBarContextValue>(
		() => ({ action, onClickRef, publish, clear }),
		[action, publish, clear],
	);

	return (
		<BottomBarContext.Provider value={value}>
			{children}
		</BottomBarContext.Provider>
	);
}

function useBottomBar(): BottomBarContextValue {
	const ctx = useContext(BottomBarContext);
	if (!ctx) {
		throw new Error("useBottomBar must be used within a BottomBarProvider");
	}
	return ctx;
}

/** Read the currently registered action (for the nav to render). */
export function useBottomBarState() {
	const { action, onClickRef } = useBottomBar();
	return { action, onClickRef };
}

/**
 * Register a primary action on the fixed bottom bar for as long as the calling
 * component is mounted. Pass `null` to leave the bar as the default nav.
 *
 * The `onClick` callback is always read from the latest render, so it stays in
 * sync with page state (form fields, etc.) without re-publishing on every
 * keystroke; only the visible label/disabled/loading changes re-render the bar.
 */
export function useBottomBarAction(action: BottomBarAction | null) {
	const { onClickRef, publish, clear } = useBottomBar();

	// Keep the callback fresh without churning the published display state.
	onClickRef.current = action?.onClick ?? (() => {});

	const label = action?.label;
	const disabled = action?.disabled;
	const loading = action?.loading;

	useEffect(() => {
		if (label === undefined) {
			clear();
			return;
		}
		publish({ label, disabled, loading });
		return () => clear();
	}, [label, disabled, loading, publish, clear]);
}
