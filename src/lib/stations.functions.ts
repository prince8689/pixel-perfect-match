import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { demoStations } from "./skyshield-data";

export const getSkyshieldStations = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return { stations: demoStations, source: "Local demo fixture" };

  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
  const { data, error } = await client.from("skyshield_stations").select("*").order("id");
  if (error || !data?.length) {
    console.error("SkyShield station feed unavailable; using demo fixture", error?.message);
    return { stations: demoStations, source: "Local demo fixture" };
  }
  return { stations: data, source: "Cloud demo records" };
});