import { useMutation, useQueryClient } from "@tanstack/react-query";

import { apiPut } from "@/lib/api-client";
import { MutationConfig } from "@/lib/react-query";
import { type CounterData } from "@/types/api";

import { COUNTER_QUERY_KEY } from "./get-counter";

export const incrementCounter = (withCsrf = true) => {
  return apiPut<{ counter: number }>("/counter", { withCsrf });
};

type UseIncrementCounterOptions = {
  mutationConfig?: MutationConfig<typeof incrementCounter>;
};

export const useIncrementCounter = ({ mutationConfig }: UseIncrementCounterOptions = {}) => {
  const queryClient = useQueryClient();

  const { onSuccess, onError } = mutationConfig || {};

  return useMutation({
    onSuccess: (data, variables, context) => {
      if ("counter" in data) {
        queryClient.setQueryData<CounterData>(COUNTER_QUERY_KEY, data);
        onSuccess?.(data, variables, context);
      } else {
        throw data;
      }
    },
    onError(error, variables, context) {
      if (onError) {
        onError(error, variables, context);
      }
    },
    mutationFn: incrementCounter,
  });
};
