"use client";

import { useState } from "react";
import { PlantCombobox } from "~/components/PlantCombobox";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { Plant } from "~/lib/plant-types";
import { api } from "~/trpc/react";

/**
 * Inline Origin editor: point a Plant at the parent(s) it descends from as a
 * Division (one parent) or Cross (seed × pollen). Saves in place, then
 * invalidates the plant queries so the rooted Pedigree it feeds re-fetches —
 * this lives alongside the pedigree under "Family history".
 */
export function OriginEditor({
	plantId,
	plant,
	plants,
}: {
	plantId: string;
	plant: Plant;
	plants: Plant[];
}) {
	const utils = api.useUtils();
	const recordDivision = api.plants.recordDivision.useMutation();
	const recordCross = api.plants.recordCross.useMutation();
	const clearPlantOrigin = api.plants.clearPlantOrigin.useMutation();

	const [kind, setKind] = useState<"division" | "cross">(
		plant.originKind ?? "division",
	);
	const [divParent, setDivParent] = useState<string | null>(null);
	const [seed, setSeed] = useState<string | null>(null);
	const [pollen, setPollen] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	const hasOrigin = plant.originKind !== null;

	async function save() {
		setError(null);
		setSaved(false);
		setSaving(true);
		try {
			// Replacing an existing Origin: clear it first (record* rejects a second).
			if (hasOrigin) {
				await clearPlantOrigin.mutateAsync({ plantId });
			}
			if (kind === "division") {
				if (!divParent) {
					setError("Choose a parent");
					setSaving(false);
					return;
				}
				await recordDivision.mutateAsync({
					childId: plantId,
					parentId: divParent,
				});
			} else {
				if (!seed || !pollen) {
					setError("Choose both parents");
					setSaving(false);
					return;
				}
				await recordCross.mutateAsync({
					childId: plantId,
					seedParentId: seed,
					pollenParentId: pollen,
				});
			}
			await utils.plants.invalidate();
			setSaved(true);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Something went wrong");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="space-y-4 rounded-lg border p-3">
			<p className="text-muted-foreground text-sm">
				Point {plant.name} at the parent(s) it descends from.
			</p>

			<Tabs
				onValueChange={(v) => {
					setKind(v as "division" | "cross");
					setSaved(false);
				}}
				value={kind}
			>
				<TabsList>
					<TabsTrigger value="division">Division</TabsTrigger>
					<TabsTrigger value="cross">Cross</TabsTrigger>
				</TabsList>
			</Tabs>

			{kind === "division" ? (
				<div className="space-y-2">
					<Label>Parent</Label>
					<PlantCombobox
						exclude={[plantId]}
						onSelect={setDivParent}
						placeholder="Choose the parent"
						plants={plants}
						value={divParent}
					/>
				</div>
			) : (
				<div className="space-y-4">
					<div className="space-y-2">
						<Label>Seed parent</Label>
						<PlantCombobox
							exclude={[plantId, pollen]}
							onSelect={setSeed}
							placeholder="Choose the seed parent"
							plants={plants}
							value={seed}
						/>
					</div>
					<div className="space-y-2">
						<Label>Pollen parent</Label>
						<PlantCombobox
							exclude={[plantId, seed]}
							onSelect={setPollen}
							placeholder="Choose the pollen parent"
							plants={plants}
							value={pollen}
						/>
					</div>
				</div>
			)}

			{error ? <p className="text-destructive text-sm">{error}</p> : null}
			{saved ? <p className="text-muted-foreground text-sm">Saved.</p> : null}

			<Button disabled={saving} onClick={save}>
				{saving ? <Spinner /> : null}
				{hasOrigin ? "Update origin" : "Save origin"}
			</Button>
		</div>
	);
}
