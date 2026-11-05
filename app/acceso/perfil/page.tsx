import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";
export const metadata: Metadata = {
  title: "Elige tu usuario · Arcade Vault",
};
export default function PerfilPage() {
  return <ProfileForm />;
}
