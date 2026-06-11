import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns whether the user has activated the "merchant mode" (perso vs business
 * transactions split). Reads from the already-loaded auth profile — no extra
 * network request.
 */
export function useMerchantMode(): boolean {
  const { profile } = useAuth();
  return Boolean((profile as any)?.merchant_mode);
}
