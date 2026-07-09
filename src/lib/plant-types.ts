import type { RouterOutputs } from "~/trpc/react";

/** A single Plant row (as returned by `plants.listPlants`). */
export type Plant = RouterOutputs["plants"]["listPlants"][number];

/** One Inventory grid item: a Plant plus its resolved cover and photo count. */
export type InventoryItem = RouterOutputs["plants"]["listInventory"][number];

/** A Plant with its Timeline photos and Origin parents (detail page). */
export type PlantDetail = NonNullable<
	RouterOutputs["plants"]["getPlantDetail"]
>;

/** One Photo in a Plant's Timeline. */
export type PlantPhoto = PlantDetail["photos"][number];

/** A Plant's rooted Pedigree. */
export type Pedigree = NonNullable<RouterOutputs["plants"]["getPedigree"]>;

/** One node of a rooted Pedigree. */
export type PedigreeNode = Pedigree["nodes"][number];
