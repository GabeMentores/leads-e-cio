/**
 * Typed references to the semantic CSS tokens defined in `tokens.css`.
 *
 * Use these in TS/JS when you need a token by name (e.g. mapping a ticket
 * status to its color) instead of hardcoding a CSS variable string. The
 * VALUES live in tokens.css — this file only names the contract.
 */

/** SLA / risk / health status — the "number/status" half of the
 *  number+explanation pattern (CLAUDE.md §2). */
export const STATUS = ['critical', 'at-risk', 'regular', 'on-track'] as const;
export type Status = (typeof STATUS)[number];

/** Origin of a widget/field — the transversal ITSM-native vs BELA rule. */
export const ORIGIN = ['itsm-native', 'bela-module', 'hybrid-layer'] as const;
export type Origin = (typeof ORIGIN)[number];

/** CSS custom-property name for a status, e.g. `statusVar('critical','surface')`. */
export function statusVar(
  status: Status,
  part: 'solid' | 'surface' | 'border' | 'fg' = 'solid',
): string {
  return part === 'solid'
    ? `hsl(var(--status-${status}))`
    : `hsl(var(--status-${status}-${part}))`;
}

/** The chrome color for a given origin: BELA accent for anything AI-generated,
 *  neutral tag for pure ITSM-native. Hybrid uses BELA accent for the enriched
 *  part only (the base stays neutral). */
export function originTag(origin: Origin): 'accent-bela' | 'tag-neutral' {
  return origin === 'itsm-native' ? 'tag-neutral' : 'accent-bela';
}
