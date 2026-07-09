import "~/styles/globals.css";

import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { TooltipProvider } from "~/components/ui/tooltip";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
	title: "Plant Family",
	description: "Track and share your plants",
	icons: [{ rel: "icon", url: "/favicon.svg" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html className={`${geist.variable} font-sans`} lang="en">
			<body>
				<AuthKitProvider>
					<TRPCReactProvider>
						<TooltipProvider>{children}</TooltipProvider>
					</TRPCReactProvider>
				</AuthKitProvider>
			</body>
		</html>
	);
}
