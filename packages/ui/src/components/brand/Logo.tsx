import * as React from 'react';

/**
 * bela logo — the four-petal pinwheel + wordmark. Exact vector paths from the
 * supplied master (assets/logo/bela-lockup-white.svg). Do NOT redraw, re-typeset
 * the wordmark, recolour a single petal, add a fifth, or rotate off orientation.
 * The trailing petal pair sits at 40% opacity — that relationship is the mark.
 */
export const PETAL_LIGHT_A = 'M2.08301 29.5303C5.09249 35.6706 11.0797 40.0861 18.1631 40.8945C18.9714 47.9784 23.3882 53.965 29.5293 56.9746C26.8086 58.3077 23.7499 59.0576 20.5156 59.0576C9.18569 59.0575 0.000976562 49.8729 0.000976562 38.543C0.00101789 35.3092 0.750221 32.2507 2.08301 29.5303Z';
export const PETAL_LIGHT_B = 'M38.543 0C49.8729 9.11084e-05 59.0575 9.18475 59.0576 20.5146C59.0576 23.749 58.3078 26.8076 56.9746 29.5283C53.9649 23.3876 47.9781 18.9713 40.8945 18.1631C40.086 11.0793 35.6702 5.09133 29.5293 2.08203C32.2499 0.748946 35.3088 2.83186e-05 38.543 0Z';
export const PETAL_SOLID_A = 'M40.8955 18.1631C51.1178 19.3299 59.0586 28.0094 59.0586 38.5439C59.0583 49.8736 49.8736 59.0583 38.5439 59.0586C28.0241 59.0586 19.3542 51.14 18.168 40.9385L22.4092 38.3896C26.7454 35.7828 32.1667 35.7828 36.5029 38.3896L40.9424 41.0586L38.2734 36.6191C35.6665 32.2829 35.6665 26.8616 38.2734 22.5254L40.8955 18.1631Z';
export const PETAL_SOLID_B = 'M20.5146 0C31.0335 2.29897e-07 39.7012 7.91699 40.8887 18.1172L36.5029 20.7549C32.1667 23.3618 26.7454 23.3618 22.4092 20.7549L17.9697 18.0859L20.6387 22.5254C23.2456 26.8616 23.2456 32.2829 20.6387 36.6191L18.0742 40.8828C7.89482 39.676 0 31.0187 0 20.5146C8.45255e-05 9.18476 9.18476 9.25303e-05 20.5146 0Z';
export const WORDMARK = [
  'M142.849 16.1526C155.598 16.1528 163.844 23.635 163.844 36.4612V38.3704H130.021C130.48 44.4781 134.603 49.0588 142.619 49.0588C148.727 49.0588 152.544 46.463 154.071 41.8821H163.31C161.019 51.0438 153.995 56.7698 142.619 56.7698C129.64 56.8461 121.471 49.3644 121.471 36.6145C121.471 23.7117 129.793 16.1526 142.849 16.1526ZM142.619 23.8635C137.122 23.8635 132.083 26.4602 130.479 32.7971H154.835C153.842 27.6055 150.101 23.8635 142.619 23.8635Z',
  'M85.1348 21.4973C89.1048 17.6037 93.7623 16.1527 98.6484 16.1526C110.864 16.1526 117.812 24.246 117.812 36.2327C117.812 48.6771 110.177 56.4649 97.8857 56.4651C93.0758 56.4651 88.6468 54.938 85.1348 51.884V55.9299H76.8896V2.48657H85.1348V21.4973ZM97.5801 23.7874C89.9455 23.7874 85.0588 27.9866 85.0586 34.8577V37.6829C85.0586 45.3177 89.3347 49.135 97.0459 49.135C104.604 49.1349 109.261 45.0885 109.261 36.385C109.261 27.5288 104.222 23.7874 97.5801 23.7874Z',
  'M201.593 16.1526C213.961 16.2289 219 21.1919 219 30.8118V55.9299H210.755V50.6624C207.854 53.869 203.348 56.2356 197.088 56.2356C187.85 56.2355 181.971 52.3418 181.818 44.3254C181.589 33.2551 192.583 31.5756 204.265 31.4993L210.755 31.3459V30.5823C210.755 25.3145 208.235 23.7112 201.593 23.7112C196.248 23.7112 192.507 24.9331 192.354 29.8958H183.88C184.109 19.8178 190.98 16.2289 201.593 16.1526ZM204.341 37.6067C193.653 37.9885 190.141 39.897 190.141 44.0959C190.141 47.3789 192.736 49.5168 198.615 49.5168C205.639 49.5168 210.755 46.4628 210.755 41.5002V37.3772L204.341 37.6072V37.6067Z',
  'M176.608 55.9299H168.287V2.48657H176.608V55.9299Z',
];

type Palette = 'color' | 'white' | 'mono';
const PALETTES: Record<Palette, { solid: string; light: string; lightOpacity: number; word: string }> = {
  color: { solid: '#3E0CF5', light: '#B3A2FA', lightOpacity: 1, word: 'currentColor' },
  white: { solid: '#FFFFFF', light: '#FFFFFF', lightOpacity: 0.4, word: '#FFFFFF' },
  mono: { solid: '#171717', light: '#9F9F9F', lightOpacity: 1, word: 'currentColor' },
};

export interface LogoProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'ref'> {
  variant?: 'lockup' | 'symbol';
  palette?: Palette;
  size?: number;
  /** Append the "by belago" endorsement lockup. */
  signature?: boolean;
}

export function Logo({ variant = 'lockup', palette = 'color', size = 32, signature = false, style, ...rest }: LogoProps) {
  const p = PALETTES[palette];
  const petals = (
    <>
      <g opacity={p.lightOpacity}>
        <path d={PETAL_LIGHT_A} fill={p.light} />
        <path d={PETAL_LIGHT_B} fill={p.light} />
      </g>
      <path d={PETAL_SOLID_A} fill={p.solid} />
      <path d={PETAL_SOLID_B} fill={p.solid} />
    </>
  );

  if (variant === 'symbol') {
    return (
      <span role="img" aria-label="bela" style={{ display: 'inline-flex', ...style }} {...rest}>
        <svg width={size} height={size} viewBox="0 0 59.06 59.06" fill="none" style={{ display: 'block' }}>
          {petals}
        </svg>
      </span>
    );
  }

  const lockup = (
    <svg
      width={size * (219 / 60)}
      height={size}
      viewBox="0 0 219 60"
      fill="none"
      style={{ display: 'block', color: 'hsl(var(--text-primary))' }}
    >
      {petals}
      {WORDMARK.map((d, i) => (
        <path key={i} fillRule="evenodd" clipRule="evenodd" d={d} fill={p.word} />
      ))}
    </svg>
  );

  if (!signature) {
    return (
      <span role="img" aria-label="bela" style={{ display: 'inline-flex', ...style }} {...rest}>
        {lockup}
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label="bela by belago"
      style={{ display: 'inline-flex', alignItems: 'center', gap: size * 0.36, ...style }}
      {...rest}
    >
      {lockup}
      <span
        style={{
          width: 1,
          height: size * 0.66,
          background: palette === 'white' ? '#FFFFFF' : 'currentColor',
          opacity: 0.35,
        }}
      />
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 'var(--weight-bold)',
          fontSize: size * 0.26,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: palette === 'white' ? 'rgba(255,255,255,0.78)' : 'hsl(var(--text-secondary))',
          whiteSpace: 'nowrap',
        }}
      >
        by belago
      </span>
    </span>
  );
}
