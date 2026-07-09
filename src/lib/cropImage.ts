import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.addEventListener("load", () => resolve(image));
		image.addEventListener("error", reject);
		image.src = src;
	});
}

/**
 * Render the cropped region of `src` to a WebP Blob, downscaled so its longest
 * edge is at most `maxEdge` px. Used by the photo cropper before upload so we
 * store a right-sized, compressed image at the chosen aspect ratio
 * (Instagram-style) — the raw camera file (often a large PNG) never reaches
 * storage. WebP runs ~25-35% smaller than JPEG at visually-equal quality.
 */
export async function getCroppedBlob(
	src: string,
	crop: Area,
	maxEdge = 1350,
): Promise<Blob> {
	const image = await loadImage(src);
	const longest = Math.max(crop.width, crop.height);
	const scale = longest > maxEdge ? maxEdge / longest : 1;

	const canvas = document.createElement("canvas");
	canvas.width = Math.round(crop.width * scale);
	canvas.height = Math.round(crop.height * scale);
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		throw new Error("Could not process the image");
	}
	ctx.drawImage(
		image,
		crop.x,
		crop.y,
		crop.width,
		crop.height,
		0,
		0,
		canvas.width,
		canvas.height,
	);

	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) =>
				blob ? resolve(blob) : reject(new Error("Could not process the image")),
			"image/webp",
			0.82,
		);
	});
}
