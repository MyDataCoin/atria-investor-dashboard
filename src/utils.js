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
