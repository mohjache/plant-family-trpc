"use client";

import { ArrowLeft, Camera, ImageIcon, Network, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PlantDetailSkeleton } from "~/components/PlantSkeletons";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import type { PlantDetail } from "~/lib/plant-types";
import { api } from "~/trpc/react";

const originLabel = { cross: "Cross", division: "Division" } as const;

export default function PlantDetailPage() {
	const params = useParams<{ id: string }>();
	const plantId = params.id;
	const { data: detail } = api.plants.getPlantDetail.useQuery({ plantId });
	const router = useRouter();

	// The Plant is gone (deleted, or a stale link) — head back to the inventory.
	useEffect(() => {
		if (detail === null) {
			router.replace("/home");
		}
	}, [detail, router]);

	if (detail === undefined) {
		return <PlantDetailSkeleton />;
	}
	if (detail === null) {
		return <p className="text-muted-foreground text-sm">Loading…</p>;
	}

	const cover =
		detail.photos.find((p) => p.isCover) ?? detail.photos[0] ?? null;

	return (
		<div className="space-y-6">
			<Header detail={detail} />

			<div className="mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl bg-muted">
				{cover?.url ? (
					// biome-ignore lint/performance/noImgElement: remote Vercel Blob URL
					<img
						alt={detail.plant.name}
						className="size-full object-cover"
						src={cover.url}
					/>
				) : (
					<div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
						<ImageIcon className="size-10" />
						<span className="text-sm">No photos yet</span>
					</div>
				)}
			</div>

			<PhotosSummary detail={detail} plantId={plantId} />
			<OriginSummary detail={detail} plantId={plantId} />
			<DetailsForm detail={detail} />
		</div>
	);
}

function Header({ detail }: { detail: PlantDetail }) {
	const utils = api.useUtils();
	const deletePlant = api.plants.deletePlant.useMutation();
	const router = useRouter();
	const [deleting, setDeleting] = useState(false);

	async function onDelete() {
		setDeleting(true);
		try {
			await deletePlant.mutateAsync({ plantId: detail.plant.id });
			await utils.plants.invalidate();
			router.replace("/home");
		} catch {
			setDeleting(false);
		}
	}

	return (
		<div className="flex items-center gap-2">
			<Button asChild size="icon" variant="ghost">
				<Link href="/home">
					<ArrowLeft className="size-5" />
					<span className="sr-only">Back to inventory</span>
				</Link>
			</Button>
			<h1 className="flex-1 truncate font-bold text-2xl tracking-tight">
				{detail.plant.name}
			</h1>
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button size="icon" variant="ghost">
						<Trash2 className="size-5 text-destructive" />
						<span className="sr-only">Delete plant</span>
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this plant?</AlertDialogTitle>
						<AlertDialogDescription>
							This removes {detail.plant.name}, its photos, and any lineage
							links to it. This can't be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction disabled={deleting} onClick={onDelete}>
							{deleting ? <Spinner /> : null}
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function PhotosSummary({
	detail,
	plantId,
}: {
	detail: PlantDetail;
	plantId: string;
}) {
	const count = detail.photos.length;
	return (
		<section className="space-y-2">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-lg">Timeline</h2>
				<Button asChild size="sm" variant="outline">
					<Link href={`/plants/${plantId}/photos`}>
						<Camera className="size-4" />
						Update photos
					</Link>
				</Button>
			</div>
			<p className="text-muted-foreground text-sm">
				{count === 0
					? "No photos yet — add one to start this plant's history."
					: `${count} photo${count === 1 ? "" : "s"} in this plant's history.`}
			</p>
		</section>
	);
}

function OriginSummary({
	detail,
	plantId,
}: {
	detail: PlantDetail;
	plantId: string;
}) {
	const { plant, parents } = detail;
	return (
		<section className="space-y-2">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-lg">Origin</h2>
				<Button asChild size="sm" variant="outline">
					<Link href={`/plants/${plantId}/family`}>
						<Network className="size-4" />
						Family history
					</Link>
				</Button>
			</div>
			{plant.originKind ? (
				<div className="rounded-lg border p-3 text-sm">
					<Badge>{originLabel[plant.originKind]}</Badge>
					{parents.length > 0 ? (
						<span className="text-muted-foreground">
							{" — "}
							{parents
								.map((p) => (p.role ? `${p.role} parent ${p.label}` : p.label))
								.join(" × ")}
						</span>
					) : null}
				</div>
			) : (
				<p className="rounded-lg border border-dashed p-3 text-muted-foreground text-sm">
					No origin set yet. Use Family history to record where this plant came
					from.
				</p>
			)}
		</section>
	);
}

function DetailsForm({ detail }: { detail: PlantDetail }) {
	const utils = api.useUtils();
	const updatePlant = api.plants.updatePlant.useMutation();
	const { plant } = detail;
	const [name, setName] = useState(plant.name);
	const [notes, setNotes] = useState(plant.notes ?? "");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const dirty = name !== plant.name || notes !== (plant.notes ?? "");

	async function save() {
		if (name.trim() === "") {
			setError("A name is required");
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await updatePlant.mutateAsync({
				plantId: plant.id,
				name,
				notes: notes.trim() === "" ? undefined : notes,
			});
			await utils.plants.invalidate();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Something went wrong");
		} finally {
			setSaving(false);
		}
	}

	return (
		<section className="space-y-3">
			<h2 className="font-semibold text-lg">Details</h2>
			<div className="space-y-2">
				<Label htmlFor="detail-name">Name</Label>
				<Input
					id="detail-name"
					onChange={(e) => setName(e.target.value)}
					value={name}
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="detail-notes">Notes</Label>
				<Textarea
					id="detail-notes"
					onChange={(e) => setNotes(e.target.value)}
					placeholder="Care notes, source, observations…"
					rows={4}
					value={notes}
				/>
			</div>
			{error ? <p className="text-destructive text-sm">{error}</p> : null}
			<Button disabled={!dirty || saving} onClick={save}>
				{saving ? <Spinner /> : null}
				Save details
			</Button>
		</section>
	);
}
