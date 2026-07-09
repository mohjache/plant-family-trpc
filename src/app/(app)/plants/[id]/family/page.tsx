"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { OriginEditor } from "~/components/OriginEditor";
import { Pedigree } from "~/components/Pedigree";
import {
	OriginEditorSkeleton,
	PlantFamilySkeleton,
} from "~/components/PlantSkeletons";
import { Button } from "~/components/ui/button";
import { useTRPC } from "~/trpc/react";

/**
 * The Family history editor: set a Plant's Origin (Division or Cross) and see
 * the rooted Pedigree it builds. Reached from the "Family history" action on the
 * compact plant detail page. Photos live on the separate Timeline page.
 */
export default function PlantFamilyPage() {
	const params = useParams<{ id: string }>();
	const plantId = params.id;
	const trpc = useTRPC();
	const { data: detail } = useQuery(
		trpc.plants.getPlantDetail.queryOptions({ plantId }),
	);
	const { data: pedigree } = useQuery(
		trpc.plants.getPedigree.queryOptions({ plantId }),
	);
	const { data: plants } = useQuery(trpc.plants.listPlants.queryOptions());

	if (detail === undefined) {
		return <PlantFamilySkeleton />;
	}
	if (detail === null) {
		return (
			<p className="text-muted-foreground text-sm">
				This plant no longer exists.
			</p>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2">
				<Button asChild size="icon" variant="ghost">
					<Link href={`/plants/${plantId}`}>
						<ArrowLeft className="size-5" />
						<span className="sr-only">Back to plant</span>
					</Link>
				</Button>
				<h1 className="flex-1 truncate font-bold text-2xl tracking-tight">
					{detail.plant.name} · Family history
				</h1>
			</div>

			{plants === undefined ? (
				<OriginEditorSkeleton />
			) : (
				<OriginEditor plant={detail.plant} plantId={plantId} plants={plants} />
			)}

			{pedigree && pedigree.edges.length > 0 ? (
				<Pedigree data={pedigree} />
			) : (
				<p className="text-muted-foreground text-sm">
					No ancestors recorded yet. Set this plant's origin above to build its
					pedigree.
				</p>
			)}
		</div>
	);
}
