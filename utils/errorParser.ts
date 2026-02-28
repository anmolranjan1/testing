import axios from "axios";

/**
 * Parse axios error and return user-friendly message
 */
export const parseError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data) {
      return typeof error.response.data === "string"
        ? error.response.data
        : "An error occurred";
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
