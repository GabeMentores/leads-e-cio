import * as React from 'react';
import { Spark } from './Spark';

/**
 * The deck's "bela Orienta" pattern: AI-surfaced knowledge before a human
 * handoff — the product's signature AI moment. Sits on the lavender AI surface
 * (--surface-ai), never on the same white as user content: that contrast is how
 * a user tells bela apart from a colleague.
 */
export interface AISuggestionItem {
  title: string;
  meta?: string;
}

export interface AISuggestionProps {
  title?: string;
  intro?: string;
  items?: AISuggestionItem[];
  onSelect?: (item: AISuggestionItem, index: number) => void;
  footer?: React.ReactNode;
  style?: React.CSSProperties;
}

export function AISuggestion({ title, intro, items = [], onSelect, footer, style }: AISuggestionProps) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-body)',
        boxSizing: 'border-box',
        background: 'hsl(var(--surface-ai))',
        color: 'hsl(var(--surface-ai-fg))',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4)',
        boxShadow: 'var(--shadow-brand)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Spark size={9} />
        <span style={{ fontSize: 'var(--body-sm-size)', fontWeight: 'var(--weight-bold)', letterSpacing: 'var(--control-tracking)' }}>
          {title || 'bela Orienta'}
        </span>
      </div>
      {intro && (
        <p style={{ margin: 0, fontSize: 'var(--body-sm-size)', lineHeight: 1.45, opacity: 0.92, textWrap: 'pretty' }}>
          {intro}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {items.map((it, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect && onSelect(it, i)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              width: '100%',
              textAlign: 'left',
              cursor: 'pointer',
              background: 'hsl(var(--surface-1))',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 12px',
              boxShadow: 'var(--shadow-xs)',
              transition: 'var(--transition-control)',
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 'var(--body-sm-size)',
                  fontWeight: 'var(--weight-semibold)',
                  color: 'hsl(var(--text-primary))',
                  letterSpacing: 'var(--control-tracking)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {it.title}
              </span>
              {it.meta && (
                <span style={{ fontSize: 'var(--caption-size)', color: 'hsl(var(--text-muted))' }}>{it.meta}</span>
              )}
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="hsl(var(--text-muted))"
              strokeWidth="2"
              strokeLinecap="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        ))}
      </div>
      {footer}
    </div>
  );
}
