import type { Metadata } from "next";
import StyledComponentsRegistry from "@/lib/styled-components-registry";
import GlobalStyle from "./globals";

export const metadata: Metadata = {
  title: "FORM / OBJECT — Everyday essentials",
  description: "Thoughtfully selected print-on-demand essentials.",
  metadataBase: new URL(process.env.STORE_URL || "http://localhost:3000")
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <StyledComponentsRegistry>
          <GlobalStyle />
          {children}
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
