import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiDelete } from "@/lib/api-client";
import type { MutationConfig } from "@/lib/react-query";
import type { CounterData } from "@/types/api";

import { COUNTER_QUERY_KEY } from "./get-counter";

export const resetCounter = (withCsrf = true) => {
  return apiDelete("/counter", { withCsrf });
};

type UseResetCounterOptions = {
  mutationConfig?: MutationConfig<typeof resetCounter>;
};

export const useResetCounter = ({ mutationConfig }: UseResetCounterOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = mutationConfig || {};

  return useMutation({
    onSuccess: (response, variables, context) => {
      if (response.status === 204) {
        queryClient.setQueryData<CounterData>(COUNTER_QUERY_KEY, { counter: 0 });
        onSuccess?.(response, variables, context);
      } else {
        if (onError) {
          response.json().then((data) => {
            onError(data, variables, context);
          });
        }
      }
    },
    onError(error, variables, context) {
      if (onError) {
        onError(error, variables, context);
      }
    },
    mutationFn: resetCounter,
  });
};
