import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { ProgramMechanic } from "@/components/app/program-mechanic-switch";

export async function setProgramMechanic(
  programId: string,
  _locationId: string,
  mechanic: ProgramMechanic,
) {
  const current = await supabase
    .from("loyalty_programs")
    .select("mechanic_config")
    .eq("id", programId)
    .single();
  if (current.error) throw current.error;
  const config = (current.data.mechanic_config ?? {}) as Record<string, unknown>;
  const mechanicConfig =
    mechanic === "stamps"
      ? {
          ...config,
          stamps_per_purchase: Number(config["stamps_per_purchase"] ?? 1),
          stamp_target: Math.min(20, Math.max(5, Number(config["stamp_target"] ?? 10))),
          welcome_stamps: Number(config["welcome_stamps"] ?? 0),
          stamp_reward_name: String(config["stamp_reward_name"] ?? "1 café"),
        }
      : config;
  const updated = await supabase
    .from("loyalty_programs")
    .update({ mechanic_type: mechanic, mechanic_config: mechanicConfig as Json })
    .eq("id", programId);
  if (updated.error) throw updated.error;
}
