import { Sprout } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export default function Landing() {
	return (
		<main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
			<div className="flex items-center gap-2 text-primary">
				<Sprout className="size-8" />
				<span className="font-semibold text-2xl">Plant Family</span>
			</div>
			<h1 className="max-w-2xl text-balance font-bold text-4xl tracking-tight sm:text-5xl">
				Track your plants and the lineage that connects them.
			</h1>
			<p className="max-w-md text-balance text-muted-foreground">
				Build a pedigree of every plant you own and see how each one descends
				from its parents.
			</p>
			<Button asChild size="lg">
				<Link href="/home" prefetch={false}>
					Enter
				</Link>
			</Button>
		</main>
	);
}
