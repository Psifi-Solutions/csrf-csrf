import { useCounter } from "../api/get-counter";
import CounterButton from "./increment-counter-button";
import ResetCounterButton from "./reset-counter-button";

function Counter() {
  const counterQuery = useCounter();

  if (counterQuery.isLoading) {
    return <p>Loading...</p>;
  }

  const counter = counterQuery.data?.counter;
  if (typeof counter !== "number") return null;

  return (
    <>
      <div className="py-8 text-2xl">{counterQuery.data?.counter}</div>
      <div className="py-4">These buttons will work as they send requests that include the CSRF token:</div>
      <div className="flex flex-row gap-3">
        <CounterButton />
        <ResetCounterButton />
      </div>
      <div className="py-4">These buttons will not work as they send requests that do not include the CSRF token:</div>
      <div className="flex flex-row gap-3">
        <CounterButton withCsrf={false} />
        <ResetCounterButton withCsrf={false} />
      </div>
    </>
  );
}

export default Counter;
