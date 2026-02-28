import axios from "axios";

/** Maps common HTTP status codes to user-friendly messages. */
const STATUS_MESSAGES: Record<number, string> = {
  400: "The request was invalid — please check your filters.",
  401: "Your session has expired — please log in again.",
  403: "You don't have permission to view this data.",
  404: "The requested data was not found.",
  408: "The request timed out — please try again.",
  429: "Too many requests — wait a moment and try again.",
  500: "Something went wrong on the server.",
  502: "The server is temporarily unavailable.",
  503: "The service is temporarily unavailable.",
};

/**
 * Parse an error (typically from axios) into a concise, user-friendly message.
 *
 * Priority: backend message → status-code message → generic axios message → fallback.
 */
export const parseError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    // 1. Prefer the backend's own message field
    const backendMsg = error.response?.data?.message;
    if (typeof backendMsg === "string" && backendMsg.trim()) {
      return backendMsg;
    }

    // 2. If response.data is a plain string (GlobalExceptionHandler returns this)
    if (
      typeof error.response?.data === "string" &&
      error.response.data.trim()
    ) {
      return error.response.data;
    }

    // 3. Map known HTTP status codes
    const status = error.response?.status;
    if (status && STATUS_MESSAGES[status]) {
      return STATUS_MESSAGES[status];
    }

    // 4. Network-level errors (no response at all)
    if (!error.response && error.code === "ERR_NETWORK") {
      return "Network error — check your internet connection.";
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
};
