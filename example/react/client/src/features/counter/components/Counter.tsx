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
      <div className="flex flex-row gap-3">
        <CounterButton />
        <ResetCounterButton />
      </div>
      <div className="flex flex-row gap-3">
        <CounterButton withCsrf={false} />
        <ResetCounterButton withCsrf={false} />
      </div>
    </>
  );
}

export default Counter;
