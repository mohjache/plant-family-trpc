"use client";

import { format } from "date-fns";
import { ArrowLeft, ImageIcon, Pencil, Plus, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PlantTimelineSkeleton } from "~/components/PlantSkeletons";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import type { PlantPhoto } from "~/lib/plant-types";
import { api } from "~/trpc/react";

/** Format `takenAt` (ms) for a `<input type="date">` value in local time. */
function toDateInput(ms: number): string {
	return format(new Date(ms), "yyyy-MM-dd");
}

/** Parse a `<input type="date">` value into ms, anchored at local noon. */
function fromDateInput(value: string): number {
	return new Date(`${value}T12:00:00`).getTime();
}

/**
 * The Timeline manager: add update photos and edit the date/caption/cover of
 * existing ones. Reached from the "Update photos" action on the compact plant
 * detail page. Family history lives on the separate Family page.
 */
export default function PlantPhotosPage() {
	const params = useParams<{ id: string }>();
	const plantId = params.id;
	const { data: detail } = api.plants.getPlantDetail.useQuery({ plantId });

	if (detail === undefined) {
		return <PlantTimelineSkeleton />;
	}
	if (detail === null) {
		return (
			<p className="text-muted-foreground text-sm">
				This plant no longer exists.
			</p>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<Button asChild size="icon" variant="ghost">
					<Link href={`/plants/${plantId}`}>
						<ArrowLeft className="size-5" />
						<span className="sr-only">Back to plant</span>
					</Link>
				</Button>
				<h1 className="flex-1 truncate font-bold text-2xl tracking-tight">
					{detail.plant.name} · Timeline
				</h1>
				<Button asChild size="sm">
					<Link href={`/plants/${plantId}/photos/new`}>
						<Plus className="size-4" />
						Add photo
					</Link>
				</Button>
			</div>

			{detail.photos.length === 0 ? (
				<p className="rounded-lg border border-dashed p-4 text-center text-muted-foreground text-sm">
					No photos yet. Add one to start this plant's timeline.
				</p>
			) : (
				<ol className="space-y-4">
					{detail.photos.map((photo) => (
						<PhotoRow key={photo.id} photo={photo} />
					))}
				</ol>
			)}
		</div>
	);
}

function PhotoRow({ photo }: { photo: PlantPhoto }) {
	const utils = api.useUtils();
	const updatePhoto = api.plants.updatePhoto.useMutation();
	const setCover = api.plants.setCover.useMutation();
	const removePhoto = api.plants.removePhoto.useMutation();

	const [editing, setEditing] = useState(false);
	const [date, setDate] = useState(toDateInput(photo.takenAt));
	const [caption, setCaption] = useState(photo.caption ?? "");
	const [saving, setSaving] = useState(false);

	async function saveEdit() {
		setSaving(true);
		try {
			await updatePhoto.mutateAsync({
				photoId: photo.id,
				takenAt: fromDateInput(date),
				caption: caption.trim() === "" ? "" : caption,
			});
			await utils.plants.invalidate();
			setEditing(false);
		} finally {
			setSaving(false);
		}
	}

	async function onSetCover() {
		await setCover.mutateAsync({ photoId: photo.id });
		await utils.plants.invalidate();
	}

	async function onRemove() {
		await removePhoto.mutateAsync({ photoId: photo.id });
		await utils.plants.invalidate();
	}

	return (
		<li className="mx-auto w-full max-w-sm overflow-hidden rounded-xl border">
			<div className="relative aspect-[4/5] w-full bg-muted">
				{photo.url ? (
					// biome-ignore lint/performance/noImgElement: remote Vercel Blob URL
					<img
						alt={photo.caption ?? "Plant photo"}
						className="size-full object-cover"
						src={photo.url}
					/>
				) : (
					<div className="flex size-full items-center justify-center text-muted-foreground">
						<ImageIcon className="size-6" />
					</div>
				)}
				{photo.isCover ? (
					<Badge className="absolute top-2 left-2 gap-1 bg-black/60 text-white">
						<Star className="size-3 fill-current" />
						Cover
					</Badge>
				) : null}
			</div>

			<div className="space-y-3 p-3">
				{editing ? (
					<div className="space-y-2">
						<div className="space-y-1">
							<Label htmlFor={`date-${photo.id}`}>Date taken</Label>
							<Input
								id={`date-${photo.id}`}
								onChange={(e) => setDate(e.target.value)}
								type="date"
								value={date}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor={`caption-${photo.id}`}>Caption</Label>
							<Input
								id={`caption-${photo.id}`}
								onChange={(e) => setCaption(e.target.value)}
								placeholder="Repotted, first bloom…"
								value={caption}
							/>
						</div>
						<div className="flex gap-2">
							<Button disabled={saving} onClick={saveEdit} size="sm">
								{saving ? <Spinner /> : null}
								Save
							</Button>
							<Button
								onClick={() => setEditing(false)}
								size="sm"
								variant="ghost"
							>
								Cancel
							</Button>
						</div>
					</div>
				) : (
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0">
							<p className="font-medium text-sm">
								{format(new Date(photo.takenAt), "d MMM yyyy")}
							</p>
							{photo.caption ? (
								<p className="text-muted-foreground text-sm">{photo.caption}</p>
							) : null}
						</div>
						<div className="flex shrink-0 gap-1">
							{!photo.isCover ? (
								<Button
									onClick={onSetCover}
									size="icon-sm"
									title="Set as cover"
									variant="ghost"
								>
									<Star className="size-4" />
									<span className="sr-only">Set as cover</span>
								</Button>
							) : null}
							<Button
								onClick={() => setEditing(true)}
								size="icon-sm"
								title="Edit"
								variant="ghost"
							>
								<Pencil className="size-4" />
								<span className="sr-only">Edit photo</span>
							</Button>
							<Button
								onClick={onRemove}
								size="icon-sm"
								title="Remove"
								variant="ghost"
							>
								<Trash2 className="size-4 text-destructive" />
								<span className="sr-only">Remove photo</span>
							</Button>
						</div>
					</div>
				)}
			</div>
		</li>
	);
}
