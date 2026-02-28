import dayjs from "dayjs";

/**
 * Format ISO datetime string to display format
 * @param isoString - ISO 8601 datetime string from backend
 * @returns Formatted date string
 */
export const formatDateTime = (
  isoString: string | null | undefined,
): string => {
  if (!isoString) return "";
  return dayjs(isoString).format("DD MMM YYYY, HH:mm");
};

/**
 * Format ISO datetime string to date only
 */
export const formatDate = (isoString: string | null | undefined): string => {
  if (!isoString) return "";
  return dayjs(isoString).format("DD MMM YYYY");
};

/**
 * Convert Date object to ISO string for backend (LocalDateTime format)
 * @param date - JavaScript Date object
 * @returns ISO string in format "YYYY-MM-DDTHH:mm:ss"
 */
export const toISOString = (date: Date): string => {
  return dayjs(date).format("YYYY-MM-DDTHH:mm:ss");
};

/**
 * Convert datetime-local input value to ISO string
 * @param value - Value from datetime-local input (YYYY-MM-DDTHH:mm)
 * @returns ISO string for backend
 */
export const datetimeLocalToISO = (value: string): string => {
  return dayjs(value).format("YYYY-MM-DDTHH:mm:ss");
};

/**
 * Convert ISO string to datetime-local input value
 * @param isoString - ISO 8601 datetime string from backend
 * @returns Value for datetime-local input (YYYY-MM-DDTHH:mm)
 */
export const isoToDatetimeLocal = (
  isoString: string | null | undefined,
): string => {
  if (!isoString) return "";
  return dayjs(isoString).format("YYYY-MM-DDTHH:mm");
};
