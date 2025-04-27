import type { DefaultOptions, UseMutationOptions } from "@tanstack/react-query";

export const queryConfig = {
  queries: {
    throwOnError: true,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 1000 * 60,
  },
} satisfies DefaultOptions;

export type ApiFnReturnType<FnType extends (...args: any) => Promise<any>> = Awaited<ReturnType<FnType>>;

export type QueryConfig<T extends (...args: any[]) => any> = Omit<ReturnType<T>, "queryKey" | "queryFn">;

// Use this type when building a react-query mutation that does require input parameters
export type MutationConfig<MutationFnType extends (...args: any) => Promise<any>> = UseMutationOptions<
  ApiFnReturnType<MutationFnType>,
  Error,
  Parameters<MutationFnType>[0]
>;

// Use this type when building a react-query mutation that doesn't require any input parameters
export type ControlledMutationConfig<MutationFnType extends () => Promise<any>> = UseMutationOptions<
  ApiFnReturnType<MutationFnType>,
  Error
>;
