import { useSession } from "../stores/session";
import type { SessionUser } from "@sonara/contracts";

const apiBase = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/v1";

interface ApiErrorBody {
  error?: { message?: string; code?: string };
}
interface SessionResponse {
  data: { accessToken: string; user: unknown };
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const accessToken = useSession.getState().accessToken;
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  let response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (response.status === 401 && !path.startsWith("/auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) {
      headers.set(
        "Authorization",
        `Bearer ${useSession.getState().accessToken}`,
      );
      response = await fetch(`${apiBase}${path}`, {
        ...init,
        headers,
        credentials: "include",
      });
    }
  }
  if (!response.ok) {
    const body = (await response.json()) as ApiErrorBody;
    throw new Error(
      body.error?.message ?? `Request failed (${response.status})`,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function refreshSession(): Promise<boolean> {
  try {
    const response = await fetch(`${apiBase}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      useSession.getState().clearSession();
      return false;
    }
    const body = (await response.json()) as SessionResponse;
    const user = body.data.user as SessionUser;
    useSession.getState().setSession(body.data.accessToken, user);
    return true;
  } catch {
    return false;
  }
}
