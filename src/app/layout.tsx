import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const texto = Schibsted_Grotesk({
  variable: "--font-texto",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Rastro: toda venda deixa um rastro",
    template: "%s | Rastro",
  },
  description:
    "Quando um creator diz que a venda não contou, o Rastro lê o caminho da venda, explica em minutos o que aconteceu e leva cada causa ao time que pode evitá-la. Protótipo para o Desafio de Inovação YouShop 2027.",
};

export const viewport: Viewport = {
  themeColor: "#172033",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${texto.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
