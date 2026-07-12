import { BottomNav } from "~/components/BottomNav";
import { BottomBarProvider } from "~/components/bottom-bar-context";

export default function AppLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<BottomBarProvider>
			<div className="mx-auto flex min-h-svh w-full max-w-3xl flex-col">
				<main className="flex-1 px-4 pt-4 pb-24">{children}</main>
				<BottomNav />
			</div>
		</BottomBarProvider>
	);
}
