/**
 * Shared API client helper: typed fetch + consistent error shape.
 * Use instead of raw fetch + res.json to get server error messages and avoid parse failures.
 */

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; status: number; error: string };

const DEFAULT_MESSAGES: Record<number, string> = {
  400: "בקשה לא תקינה",
  401: "נדרשת התחברות",
  403: "אין הרשאה",
  404: "לא נמצא",
  409: "הפעולה לא התאפשרה (למשל משבצת תפוסה)",
  500: "שגיאה בשרת",
};

function defaultMessageForStatus(status: number): string {
  return DEFAULT_MESSAGES[status] ?? "שגיאה";
}

export async function apiJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<ApiOk<T> | ApiErr> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (e) {
    if (isAbortError(e)) {
      return { ok: false, status: 0, error: "הבקשה בוטלה" };
    }
    return { ok: false, status: 0, error: "Network error" };
  }

  let data: { error?: string } = {};
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text) as { error?: string };
    } catch {
      // invalid JSON; keep data = {}
    }
  }

  if (!res.ok) {
    const error = typeof data.error === "string" && data.error.trim() ? data.error.trim() : defaultMessageForStatus(res.status);
    return { ok: false, status: res.status, error };
  }

  let parsed: T;
  try {
    parsed = (text ? JSON.parse(text) : {}) as T;
  } catch {
    return { ok: false, status: res.status, error: "תשובה לא תקינה מהשרת" };
  }

  return { ok: true, data: parsed };
}

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}
