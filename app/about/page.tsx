import type { Metadata } from "next";
import { AboutPage } from "@/components/about/about-page";

export const metadata: Metadata = {
  title: "Acerca de · Arcade Vault",
};

export default function About() {
  return <AboutPage />;
}
