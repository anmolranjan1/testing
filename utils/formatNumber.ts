/**
 * Format a number with locale-aware thousand separators.
 * Returns "0" for nullish input.
 */
export const formatNumber = (num: number | undefined | null): string =>
  new Intl.NumberFormat("en-US").format(num ?? 0);
