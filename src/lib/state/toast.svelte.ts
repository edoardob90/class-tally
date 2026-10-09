import type { Component } from 'svelte';

export interface ToastAction {
	key: string;
	label: string;
	icon?: Component<{ size?: number }>;
	run: () => void | Promise<void>;
}

export interface ToastItem {
	id: number;
	text: string;
	actions: ToastAction[];
	durationMs: number;
	/** Epoch ms when the toast goes away (compared with the clock, so throttled timers cannot extend it). */
	deadline: number;
	paused: boolean;
	tone: 'default' | 'error';
}

export interface ToastOptions {
	text: string;
	actions?: ToastAction[];
	durationMs?: number;
	tone?: 'default' | 'error';
}

let nextId = 1;

/** One toast at a time: showing a new one replaces the previous one. */
class ToastState {
	current = $state.raw<ToastItem | null>(null);

	show(options: ToastOptions): number {
		const durationMs = options.durationMs ?? 8000;
		const id = nextId++;
		this.current = {
			id,
			text: options.text,
			actions: options.actions ?? [],
			durationMs,
			deadline: Date.now() + durationMs,
			paused: false,
			tone: options.tone ?? 'default'
		};
		return id;
	}

	pause(): void {
		if (this.current) this.current = { ...this.current, paused: true };
	}

	/** Lets the toast run for another `ms` milliseconds. */
	resume(ms = 3000): void {
		if (this.current) {
			this.current = {
				...this.current,
				paused: false,
				durationMs: ms,
				deadline: Date.now() + ms
			};
		}
	}

	/** Changes the text of the toast with this id, if it is still showing. */
	updateText(id: number, text: string): void {
		if (this.current?.id === id) this.current = { ...this.current, text };
	}

	dismiss(id?: number): void {
		if (id === undefined || this.current?.id === id) this.current = null;
	}

	/** Called by the host on a timer; dismisses the toast when its deadline has passed. */
	tick(now: number = Date.now()): void {
		const c = this.current;
		if (c && !c.paused && now >= c.deadline) this.current = null;
	}
}

export const toast = new ToastState();
