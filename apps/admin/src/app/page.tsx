import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Slobodno — Admin</h1>
        <p className="mt-2 text-sm text-gray-500">
          Faza 1: skelet.{" "}
          <Link href="/admin" className="underline">
            Idi na /admin
          </Link>
        </p>
      </div>
    </main>
  );
}
