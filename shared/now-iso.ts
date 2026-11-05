/** The current time as an ISO string. For event handlers and callbacks, not for render. */
export function nowIso() {
  return new Date().toISOString()
}
