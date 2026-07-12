"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upload } from "@vercel/blob/client";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useBottomBarAction } from "~/components/bottom-bar-context";
import { PhotoCropInput } from "~/components/PhotoCropInput";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { PhotoDate, PhotoDateSource } from "~/lib/exifDate";
import { useTRPC } from "~/trpc/react";

export default function NewPhotoPage() {
	const params = useParams<{ id: string }>();
	const plantId = params.id;
	const router = useRouter();

	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const addPhoto = useMutation(trpc.plants.addPhoto.mutationOptions());

	const [blob, setBlob] = useState<Blob | null>(null);
	const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
	const [caption, setCaption] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	// Which source auto-filled the date (if any) — drives a small hint under the
	// field. `null` means today's default or a manual edit.
	const [dateSource, setDateSource] = useState<PhotoDateSource | null>(null);
	// Once the user edits the date by hand, stop overriding it from the photo.
	const [dateEdited, setDateEdited] = useState(false);

	function onDateTaken(taken: PhotoDate | null) {
		if (dateEdited || !taken) return;
		setDate(format(taken.date, "yyyy-MM-dd"));
		setDateSource(taken.source);
	}

	async function save() {
		if (!blob) {
			setError("Add and crop a photo first");
			return;
		}
		setSaving(true);
		setError(null);
		try {
			const result = await upload(
				`plants/${plantId}/${Date.now()}.webp`,
				blob,
				{
					access: "private",
					handleUploadUrl: "/api/upload",
					contentType: blob.type,
				},
			);
			await addPhoto.mutateAsync({
				plantId,
				url: result.url,
				pathname: result.pathname,
				takenAt: new Date(`${date}T12:00:00`).getTime(),
				caption: caption.trim() === "" ? undefined : caption,
			});
			await queryClient.invalidateQueries(trpc.plants.pathFilter());
			router.replace(`/plants/${plantId}/photos`);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Upload failed");
			setSaving(false);
		}
	}

	// Turn the fixed bottom bar into the Save action so the nav tabs can't be
	// misclicked mid-upload and discard the photo being added.
	useBottomBarAction({
		label: "Save photo",
		onClick: save,
		disabled: saving,
		loading: saving,
	});

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-2">
				<Button asChild size="icon" variant="ghost">
					<Link href={`/plants/${plantId}`}>
						<ArrowLeft className="size-5" />
						<span className="sr-only">Back</span>
					</Link>
				</Button>
				<h1 className="font-bold text-2xl tracking-tight">Add a photo</h1>
			</div>

			<div className="space-y-2">
				<Label htmlFor="photo-date">Date taken</Label>
				<Input
					id="photo-date"
					onChange={(e) => {
						setDate(e.target.value);
						setDateEdited(true);
						setDateSource(null);
					}}
					type="date"
					value={date}
				/>
				{dateSource === "exif" ? (
					<p className="text-muted-foreground text-xs">
						Filled in from the photo’s metadata.
					</p>
				) : dateSource === "file" ? (
					<p className="text-muted-foreground text-xs">
						No capture date in this photo — used the file’s date. Adjust if
						needed.
					</p>
				) : null}
			</div>

			<PhotoCropInput onChange={setBlob} onDateTaken={onDateTaken} />

			<div className="space-y-2">
				<Label htmlFor="photo-caption">Caption (optional)</Label>
				<Input
					id="photo-caption"
					onChange={(e) => setCaption(e.target.value)}
					placeholder="Repotted, first bloom, split into 3…"
					value={caption}
				/>
			</div>

			{error ? <p className="text-destructive text-sm">{error}</p> : null}
		</div>
	);
}
