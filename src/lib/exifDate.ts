import exifr from "exifr";

/** Where a derived photo date came from, so the UI can be honest about it. */
export type PhotoDateSource = "exif" | "file";

export type PhotoDate = {
	date: Date;
	source: PhotoDateSource;
};

/**
 * Best-effort "date taken" for an image file, entirely client-side.
 *
 * Prefers the real capture date embedded in the image (EXIF `DateTimeOriginal`,
 * falling back to `CreateDate`) across JPEG, TIFF, HEIC/HEIF, PNG and AVIF via
 * `exifr`. Many files carry no EXIF though — screenshots, edited exports, or
 * anything downloaded/copied between computers — so as a fallback we use the
 * file's last-modified timestamp (the same "Modified" date the OS shows in file
 * properties). Callers get `source` to distinguish the two.
 *
 * Returns `null` only when neither is available (e.g. a non-image file).
 */
export async function readPhotoDate(file: File): Promise<PhotoDate | null> {
	if (!file.type.startsWith("image/")) return null;

	const exifDate = await readExifDate(file);
	if (exifDate) return { date: exifDate, source: "exif" };

	if (file.lastModified) {
		const fileDate = new Date(file.lastModified);
		if (!Number.isNaN(fileDate.getTime())) {
			return { date: fileDate, source: "file" };
		}
	}
	return null;
}

/** Read EXIF `DateTimeOriginal`/`CreateDate`, or null if absent/unparseable. */
async function readExifDate(file: File): Promise<Date | null> {
	try {
		// Parse only the two date tags we care about, so exifr tree-shakes down to
		// the minimal reader instead of decoding every segment.
		const out = await exifr.parse(file, ["DateTimeOriginal", "CreateDate"]);
		const date = out?.DateTimeOriginal ?? out?.CreateDate ?? null;
		return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
	} catch {
		// Corrupt/unsupported data — treat as "no EXIF date", never throw.
		return null;
	}
}
