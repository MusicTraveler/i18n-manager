import type { Metadata } from "next";
import 'normalize.css';
import "@/styles/globals.scss";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/select/lib/css/blueprint-select.css";

export const metadata: Metadata = {
  title: "i18n Manager",
  description: "Manage internationalization messages",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bp6-dark">
      <body className="bp6-dark">
        {children}
      </body>
    </html>
  );
}
