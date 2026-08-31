import { supabase } from "@/integrations/supabase/client";
import type { ProgramMechanic } from "@/components/app/program-mechanic-switch";

export async function setProgramMechanic(
  programId: string,
  locationId: string,
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
          stamps_per_purchase: Number(config.stamps_per_purchase ?? 1),
          stamp_target: Math.min(20, Math.max(5, Number(config.stamp_target ?? 10))),
          welcome_stamps: Number(config.welcome_stamps ?? 0),
          stamp_reward_name: String(config.stamp_reward_name ?? "1 café"),
        }
      : config;
  const updated = await supabase
    .from("loyalty_programs")
    .update({ mechanic_type: mechanic, mechanic_config: mechanicConfig })
    .eq("id", programId);
  if (updated.error) throw updated.error;
  if (mechanic !== "stamps") return;

  const rewards = await supabase
    .from("rewards")
    .select("id")
    .eq("program_id", programId)
    .order("created_at");
  if (rewards.error) throw rewards.error;
  const primary = rewards.data?.[0];
  if ((rewards.data?.length ?? 0) > 1) {
    const paused = await supabase
      .from("rewards")
      .update({ status: "paused" })
      .in(
        "id",
        rewards.data!.slice(1).map((reward) => reward.id),
      );
    if (paused.error) throw paused.error;
  }
  if (primary) {
    const stampTarget = Number(mechanicConfig.stamp_target);
    const normalized = await supabase
      .from("rewards")
      .update({
        points_cost: stampTarget,
        status: "active",
        redemption_limit_type: "unlimited",
        redemption_limit_count: null,
      })
      .eq("id", primary.id);
    if (normalized.error) throw normalized.error;
    return;
  }
  const created = await supabase
    .from("rewards")
    .insert({
      program_id: programId,
      name: String(mechanicConfig.stamp_reward_name),
      points_cost: Number(mechanicConfig.stamp_target),
      status: "active",
      redemption_limit_type: "unlimited",
      redemption_limit_count: null,
    })
    .select("id")
    .single();
  if (created.error) throw created.error;
  const associated = await supabase
    .from("reward_locations")
    .insert({ reward_id: created.data.id, location_id: locationId });
  if (associated.error) throw associated.error;
}
