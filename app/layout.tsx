import type { Metadata } from "next";
import "./globals.css";

import { CartProvider } from "./cart/cartContext";

const STORE_NAME = "Paix\u00e3o por A\u00e7a\u00ed e Doces";

export const metadata: Metadata = {
  title: STORE_NAME,
  description: `Cardapio digital do ${STORE_NAME}`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
