import { type CSRFErrorResponse } from "../types/api";
import { useApi } from "./api-store";

type BaseApiRequest = Omit<RequestInit, "credentials"> & { withCsrf?: boolean };
type ApiRequestInit = Omit<BaseApiRequest, "method">;

const BASE_API_URL = import.meta.env.VITE_EXAMPLE_BASE_API_URL;
console.log(`BASE API URL: ${BASE_API_URL}`);

// Note that the withCsrf option here is just for "convenience" of the example
// to demonstrate requests failing CSRF protection because it's not included
const baseFetch = (path = "", options: BaseApiRequest = { withCsrf: true }) => {
  const { csrfToken } = useApi.getState();
  const { headers = {}, withCsrf, ...remainingOptions } = options;
  const requestHeaders = new Headers(headers);
  if (withCsrf && typeof csrfToken === "string") {
    requestHeaders.set("x-csrf-token", csrfToken);
  }
  // Spread vs Object.assign/alternatives is typically fine for this usecase
  return fetch(`${BASE_API_URL}${path}`, {
    ...remainingOptions,
    headers: requestHeaders,
    credentials: "include",
  });
};

const baseDataFetch = <T>(path: string, options: BaseApiRequest = {}) => {
  return baseFetch(path, options).then((response) => response.json()) as unknown as Promise<T>;
};

export const apiGet = <T>(path: string, options: ApiRequestInit = {}) =>
  baseDataFetch<T>(path, { ...options, method: "GET" });

export const apiPost = <T>(path: string, options: ApiRequestInit = {}) =>
  baseDataFetch<T | CSRFErrorResponse>(path, { ...options, method: "POST" });

export const apiPut = <T>(path: string, options: ApiRequestInit = {}) =>
  baseDataFetch<T | CSRFErrorResponse>(path, { ...options, method: "PUT" });

export const apiPatch = <T>(path: string, options: ApiRequestInit = {}) =>
  baseDataFetch<T | CSRFErrorResponse>(path, { ...options, method: "PATCH" });

export const apiDelete = (path: string, options: ApiRequestInit = {}) =>
  baseFetch(path, { ...options, method: "DELETE" });

export const getCsrfToken = () => apiGet<{ csrfToken: string } | { message: string; code: string }>("/csrf-token");
