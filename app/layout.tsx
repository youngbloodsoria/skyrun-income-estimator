import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkyRun Brian Head | Vacation Rental Income Estimate",
  description: "See the income potential of your Brian Head vacation property with a personalized SkyRun estimate."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
