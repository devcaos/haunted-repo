// Builds the one HauntedPower of a Power_Server run. No MCP SDK and no
// node:fs here: openStore (store.ts) does the disk work, and guardFetch sits
// in front of every network request (Requirements 7.7, 8.1).
import { guardFetch } from "./guardFetch.js";
import { HauntedPower } from "./power.js";
import { openStore } from "./store.js";

export async function createPower(
  pluginData: string | undefined,
  baseFetch: typeof fetch,
): Promise<HauntedPower> {
  const { store, storageOk } = await openStore(pluginData);
  return new HauntedPower({ fetch: guardFetch(baseFetch), store, storageOk });
}
