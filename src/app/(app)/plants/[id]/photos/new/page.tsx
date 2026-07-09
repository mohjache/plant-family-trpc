"use client";

import { upload } from "@vercel/blob/client";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { PhotoCropInput } from "~/components/PhotoCropInput";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { api } from "~/trpc/react";

export default function NewPhotoPage() {
	const params = useParams<{ id: string }>();
	const plantId = params.id;
	const router = useRouter();

	const utils = api.useUtils();
	const addPhoto = api.plants.addPhoto.useMutation();

	const [blob, setBlob] = useState<Blob | null>(null);
	const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
	const [caption, setCaption] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

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
					access: "public",
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
			await utils.plants.invalidate();
			router.replace(`/plants/${plantId}/photos`);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Upload failed");
			setSaving(false);
		}
	}

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

			<PhotoCropInput onChange={setBlob} />

			<div className="space-y-2">
				<Label htmlFor="photo-date">Date taken</Label>
				<Input
					id="photo-date"
					onChange={(e) => setDate(e.target.value)}
					type="date"
					value={date}
				/>
			</div>
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

			<Button className="w-full" disabled={saving} onClick={save}>
				{saving ? <Spinner /> : null}
				Save photo
			</Button>
		</div>
	);
}
