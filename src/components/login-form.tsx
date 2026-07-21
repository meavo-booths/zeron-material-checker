"use client";

import { signIn } from "next-auth/react";
import { LOGIN_ERROR_MESSAGES } from "@/lib/login-errors";

export default function LoginForm({ errorKey = "" }: { errorKey?: string }) {
  const errorMessage = LOGIN_ERROR_MESSAGES[errorKey];

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-meavo-ink">Zeron Material Checker</h1>
          <p className="mt-2 text-sm text-meavo-grey">
            Sign in with your Meavo Google account. Access is granted from the gateway.
          </p>
        </div>

        {errorMessage ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{errorMessage}</p>
        ) : null}

        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          Continue with Google
        </button>

        <p className="text-center text-xs text-meavo-grey">
          Need access? Ask an admin on{" "}
          <a
            href={process.env.NEXT_PUBLIC_GATEWAY_URL ?? "https://meavo.app"}
            className="underline"
          >
            meavo.app
          </a>
          .
        </p>
      </div>
    </div>
  );
}
