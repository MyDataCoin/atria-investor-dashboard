/**
 * Returns a URL safe to use in an `href`/`src`, or `undefined` if the scheme is
 * not http(s). React does NOT sanitize `href`, so a `javascript:`/`data:` URL
 * coming from API data would execute on click; only allow web links through.
 */
export function safeUrl(url) {
  if (typeof url !== 'string') return undefined;
  return /^https?:\/\//i.test(url.trim()) ? url : undefined;
}

/**
 * Formats a monetary amount for display in Kyrgyz som (KGS).
 *
 * Amounts already arrive in KGS from the backend, so there is NO FX conversion —
 * USD/EUR are disabled until a real exchange-rate source exists. The `currency`
 * argument is kept for call-site compatibility but ignored; everything renders
 * in som.
 */
export function formatVal(amount, currency = 'KGS', includeFraction = false) {
  const value = Number(amount ?? 0);

  let formatted;
  if (includeFraction) {
    formatted = value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else if (value < 1000 && value % 1 !== 0) {
    formatted = value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    formatted = Math.round(value).toLocaleString('ru-RU');
  }

  return `${formatted} с`;
}


/**
 * Percentage that never hides a real holding: 1 share of 109 294 is 0.0009%, which toFixed(2)
 * prints as "0.00%" — reading as "you own nothing".
 */
export function fmtPct(p) {
  const v = Number(p) || 0;
  if (v === 0) return '0%';
  if (v < 0.0001) return '<0.0001%';
  if (v < 0.01) return `${v.toLocaleString('ru-RU', { maximumSignificantDigits: 2 })}%`;
  return `${v.toFixed(2)}%`;
}

/** Area that keeps small fractions visible: 0.00046 m² must not round to "0 м²". */
export function fmtArea(sqm) {
  const v = Number(sqm) || 0;
  if (v === 0) return '0';
  if (v < 0.01) return v.toLocaleString('ru-RU', { maximumSignificantDigits: 2 });
  return v.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}


/** Russian noun form for a count: plural(1,'токен','токена','токенов') -> 'токен'. */
export function plural(n, one, few, many) {
  const a = Math.abs(Math.trunc(Number(n) || 0));
  const m10 = a % 10;
  const m100 = a % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
