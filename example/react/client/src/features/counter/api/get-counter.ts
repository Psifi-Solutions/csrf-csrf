import { queryOptions, useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api-client";
import { QueryConfig } from "@/lib/react-query";
import { CounterData } from "@/types/api";

export const COUNTER_QUERY_KEY = ["counter"] as const;

export const getCounter = (): Promise<CounterData> => {
  return apiGet<CounterData>("/counter");
};

export const getCounterQueryOptions = () => {
  return queryOptions({
    queryKey: COUNTER_QUERY_KEY,
    queryFn: getCounter,
    staleTime: 6e5,
  });
};

type UseCounterOptions = {
  queryConfig?: QueryConfig<typeof getCounterQueryOptions>;
};

export const useCounter = ({ queryConfig }: UseCounterOptions = {}) => {
  return useQuery({
    ...getCounterQueryOptions(),
    ...queryConfig,
  });
};
