import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactNode, Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import GlobalError from "../components/errors/GlobalError";
import Spinner from "../components/ui/spinner/Spinner";
import { queryConfig } from "../lib/react-query";
import { Notifications } from "../components/ui/notifications/notifications";

type AppProviderProps = {
  children: ReactNode;
};

function AppProvider({ children }: AppProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: queryConfig,
      }),
  );

  return (
    <Suspense
      fallback={
        <Spinner
          containerProps={{
            style: {
              width: "100vw",
              height: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            },
          }}
        />
      }
    >
      <ErrorBoundary FallbackComponent={GlobalError}>
        <QueryClientProvider client={queryClient}>
          {import.meta.env.DEV && <ReactQueryDevtools />}
          <Notifications />
          {children}
        </QueryClientProvider>
      </ErrorBoundary>
    </Suspense>
  );
}

export default AppProvider;
