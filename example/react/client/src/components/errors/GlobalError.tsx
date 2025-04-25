import { useApi } from "@/lib/api-store";

function GlobalError() {
  const { error } = useApi();

  return (
    <div className="flex flex-col w-svw h-svh items-center-safe justify-center-safe text-red-300" role="alert">
      <h2 className="text-xl leading-1.5">Ooops, something went wrong :( </h2>
      <p>{error}</p>
    </div>
  );
}

export default GlobalError;
