const CHECKOUT_ACCESS_TOKEN_KEY = "ct_checkout_access_token";

/** Preserve access token across Stripe's full-page redirect (same tab). */
export function stashAccessTokenBeforeCheckout(token: string): void {
  sessionStorage.setItem(CHECKOUT_ACCESS_TOKEN_KEY, token);
}

export function takeStashedAccessToken(): string | null {
  const token = sessionStorage.getItem(CHECKOUT_ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(CHECKOUT_ACCESS_TOKEN_KEY);
  return token;
}

export function clearStashedAccessToken(): void {
  sessionStorage.removeItem(CHECKOUT_ACCESS_TOKEN_KEY);
}
