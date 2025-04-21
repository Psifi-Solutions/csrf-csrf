import { useEffect, useState } from "react";
import viteLogo from "/vite.svg";
import reactLogo from "./assets/react.svg";
import "./App.css";
import { useErrorBoundary } from "react-error-boundary";
import Spinner from "./components/ui/spinner/Spinner";
import { useApi } from "./lib/api-store";
import Counter from "./features/counter/components/counter";

function App() {
  const { csrfToken, initialiseCsrfToken } = useApi();
  const { showBoundary } = useErrorBoundary();

  useEffect(() => {
    if (!csrfToken) {
      initialiseCsrfToken(showBoundary);
    }
  }, [csrfToken, initialiseCsrfToken, showBoundary]);

  if (!csrfToken) {
    return <Spinner />;
  }

  return (
    <>
      <div className="flex flex-row">
        <a href="https://vite.dev">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1 className="text-3xl py-2">Vite + React + CSRF</h1>
      <Counter />
    </>
  );
}

export default App;
