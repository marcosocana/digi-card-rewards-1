import { supabase } from "@/integrations/supabase/client";

export type TransactionalEmailPayload =
  | { kind: "account_welcome" }
  | { kind: "team_invitation"; invitationId: string }
  | { kind: "membership_welcome"; membershipPublicId: string }
  | { kind: "password_changed"; eventId: string };

export async function sendTransactionalEmail(payload: TransactionalEmailPayload) {
  const { data, error } = await supabase.functions.invoke("send-transactional-email", {
    body: payload,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { ok: true; duplicate?: boolean };
}
