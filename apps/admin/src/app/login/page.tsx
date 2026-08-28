import { LoginForm } from "./LoginForm";
import { GoogleButton } from "./GoogleButton";

// Nema javne signup forme — nalozi se prave isključivo kroz invite
// (superadmin poziva preko Supabase dashboard-a, Korak 4 iz brief-a).
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-semibold">
          Slobodno — Admin
        </h1>
        <LoginForm />
        <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
          <div className="h-px flex-1 bg-gray-200" />
          ili
          <div className="h-px flex-1 bg-gray-200" />
        </div>
        <GoogleButton />
      </div>
    </main>
  );
}
