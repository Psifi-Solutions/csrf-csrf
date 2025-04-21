// This particular store for the meantime is a bit of an outliar to how things should be done.
// Refer to the notification-store in bullet proof react.
import { create } from "zustand";
import { getCsrfToken } from "./api-client";

type ApiStore = {
  csrfToken: string | null;
  error: string | null;
  setError: (error: string) => void;
  initialiseCsrfToken: (handleError: (error: unknown) => void) => Promise<void>;
};

export const useApi = create<ApiStore>((set, get) => ({
  csrfToken: null,
  error: null,
  setError: (error) => {
    set((prev) => ({ ...prev, error }));
  },
  initialiseCsrfToken: async (handleError) => {
    try {
      const tokenData = await getCsrfToken();
      if ("csrfToken" in tokenData) {
        set((prev) => ({ ...prev, csrfToken: tokenData.csrfToken }));
      } else {
        get().setError(tokenData.message);
        handleError(tokenData);
      }
    } catch (error) {
      handleError(error);
    }
  },
}));
