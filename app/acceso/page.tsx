import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
export const metadata: Metadata = {
  title: "Acceso · Arcade Vault",
};
// La página es síncrona: `searchParams` se lee dentro de <Suspense> (cacheComponents).
export default function AccesoPage(props: PageProps<"/acceso">) {
  return (
    <Suspense fallback={<AuthForm />}>
      <Form searchParams={props.searchParams} />
    </Suspense>
  );
}
async function Form({
  searchParams,
}: {
  searchParams: PageProps<"/acceso">["searchParams"];
}) {
  const { error } = await searchParams;
  return <AuthForm callbackError={error === "callback"} />;
}
