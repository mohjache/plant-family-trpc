"use client";

import { Camera } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Area, Point } from "react-easy-crop";
import Cropper from "react-easy-crop";
import { Button } from "~/components/ui/button";
import { Slider } from "~/components/ui/slider";
import { getCroppedBlob } from "~/lib/cropImage";
import { type PhotoDate, readPhotoDate } from "~/lib/exifDate";

/** Portrait aspect ratio (Instagram-style 4:5) used everywhere photos display. */
export const PHOTO_ASPECT = 4 / 5;

/**
 * Instagram-style photo input: pick or shoot a photo, then pan/zoom-crop it to a
 * fixed portrait aspect inline (no modal). The crop is *live* — the current
 * frame is continuously handed to the parent via `onChange` as a cropped WebP
 * Blob (or `null` when no photo is picked), so the parent's own submit button is
 * the only confirmation. There is no separate "apply crop" step to forget.
 */
export function PhotoCropInput({
	onChange,
	onDateTaken,
}: {
	onChange: (blob: Blob | null) => void;
	/**
	 * Called when a photo is picked with its derived "date taken" — from EXIF
	 * metadata when present, otherwise the file's last-modified date — or `null`
	 * if neither is available. Lets the parent pre-fill a date field.
	 */
	onDateTaken?: (date: PhotoDate | null) => void;
}) {
	const fileInput = useRef<HTMLInputElement>(null);
	const [rawSrc, setRawSrc] = useState<string | null>(null);
	const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [areaPixels, setAreaPixels] = useState<Area | null>(null);

	// Keep the latest callbacks without making the sync effect depend on their
	// identity (parents may pass inline functions).
	const onChangeRef = useRef(onChange);
	const onDateTakenRef = useRef(onDateTaken);
	useEffect(() => {
		onChangeRef.current = onChange;
		onDateTakenRef.current = onDateTaken;
	});

	const onCropComplete = useCallback((_area: Area, pixels: Area) => {
		setAreaPixels(pixels);
	}, []);

	function pick(files: FileList | null) {
		const file = files?.[0];
		if (!file) return;
		// Reset so a stale crop from a previous photo isn't emitted.
		setAreaPixels(null);
		onChangeRef.current(null);
		setZoom(1);
		setCrop({ x: 0, y: 0 });
		setRawSrc(URL.createObjectURL(file));
		// Surface the photo's own capture date, if any, to the parent.
		if (onDateTakenRef.current) {
			readPhotoDate(file).then((date) => onDateTakenRef.current?.(date));
		}
	}

	// Re-encode the cropped frame whenever it settles and hand it to the parent.
	// Debounced so dragging/zooming doesn't encode on every intermediate frame.
	useEffect(() => {
		if (!rawSrc || !areaPixels) return;
		let cancelled = false;
		const timer = setTimeout(() => {
			getCroppedBlob(rawSrc, areaPixels)
				.then((blob) => {
					if (!cancelled) onChangeRef.current(blob);
				})
				.catch(() => {
					/* leave the previously-emitted blob in place */
				});
		}, 150);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [rawSrc, areaPixels]);

	const hiddenInput = (
		<input
			accept="image/*"
			className="hidden"
			onChange={(e) => pick(e.target.files)}
			ref={fileInput}
			type="file"
		/>
	);

	if (rawSrc) {
		return (
			<div className="space-y-3">
				<div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl bg-muted">
					<Cropper
						aspect={PHOTO_ASPECT}
						crop={crop}
						image={rawSrc}
						onCropChange={setCrop}
						onCropComplete={onCropComplete}
						onZoomChange={setZoom}
						zoom={zoom}
					/>
				</div>
				<Slider
					max={3}
					min={1}
					onValueChange={([v]) => setZoom(v ?? 1)}
					step={0.05}
					value={[zoom]}
				/>
				<Button
					className="w-full"
					onClick={() => fileInput.current?.click()}
					type="button"
					variant="outline"
				>
					Change photo
				</Button>
				{hiddenInput}
			</div>
		);
	}

	return (
		<>
			<button
				className="mx-auto flex aspect-[4/5] w-full max-w-sm flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-muted text-muted-foreground"
				onClick={() => fileInput.current?.click()}
				type="button"
			>
				<Camera className="size-10" />
				<span className="text-sm">Take or choose a photo</span>
			</button>
			{hiddenInput}
		</>
	);
}
