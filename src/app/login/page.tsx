import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

async function loginAction(formData: FormData) {
  "use server";

  const email = formData.get("email")?.toString() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard",
  });
}

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-semibold text-meavo-ink">Zeron Material Checker</h1>
        <p className="mt-2 text-sm text-meavo-grey">
          Sign in to review delivery unit-cost outliers from Zeron exports.
        </p>

        <form action={loginAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="input"
              defaultValue={process.env.ADMIN_EMAIL ?? ""}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              Password
            </label>
            <input id="password" name="password" type="password" required className="input" />
          </div>
          <button type="submit" className="btn-primary w-full">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
