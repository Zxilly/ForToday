import "../styles/globals.css";
import { Metadata } from "next";
import React from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
	title: "Seven days",
};

export const runtime = "edge";

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<SpeedInsights />
			<body>{children}</body>
		</html>
	);
}
