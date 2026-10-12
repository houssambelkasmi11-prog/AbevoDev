"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Check, Copy } from "lucide-react";
import { resetAction, signInAction, signUpAction, updatePasswordAction, type AuthState } from "@/server/actions/auth";
import { OrbitPulse } from "@/components/brand/logo";

const inputCls =
  "h-12 w-full rounded-xl border border-white/12 bg-white/[0.03] px-4 text-[15px] text-warm placeholder:text-muted/70 transition-colors focus:border-warm focus:outline-none";

function AuthInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, id, ...rest } = props;
  return (
    <div>
      <label htmlFor={id} className="label mb-2 block text-muted">
        {label}
      </label>
      <input id={id} className={inputCls} {...rest} />
    </div>
  );
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 inline-flex h-12 w-full items-center justify-center gap-3 rounded-full bg-warm font-mono text-[11px] uppercase tracking-[0.2em] text-void transition-opacity disabled:opacity-60"
    >
      {pending ? <OrbitPulse className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function Feedback({ state }: { state: AuthState }) {
  if (state.error)
    return (
      <p role="alert" className="rounded-xl border border-[#e07a68]/40 bg-[#e07a68]/10 px-4 py-3 text-[13px] text-[#f0b2a6]">
        {state.error}
      </p>
    );
  if (state.message)
    return (
      <p role="status" className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-[13px] text-silver">
        {state.message}
      </p>
    );
  return null;
}

function RecoveryCard({ code, onContinue, cta }: { code: string; onContinue: () => void; cta: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="animate-rise">
      <p className="label text-muted">Account recovery</p>
      <h1 className="display mt-4 text-[2.6rem]">Save this code.</h1>
      <p className="mt-4 text-[14px] leading-relaxed text-silver">
        You&apos;re running ORBIT locally, so there&apos;s no email reset. This one-time recovery code lets you reset your password. It won&apos;t be shown again.
      </p>
      <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-4">
        <code className="font-mono text-[15px] tracking-[0.12em] text-warm">{code}</code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(code).then(() => setCopied(true)).catch(() => undefined);
          }}
          aria-label="Copy recovery code"
          className="rounded-lg p-2 text-silver hover:bg-white/10"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <button onClick={onContinue} className="mt-8 h-12 w-full rounded-full bg-warm font-mono text-[11px] uppercase tracking-[0.2em] text-void">
        {cta}
      </button>
    </div>
  );
}

export function SignInForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signInAction, initialError ? { error: initialError } : {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <p className="label text-muted">Welcome back</p>
        <h1 className="display mt-4 text-[2.8rem]">Sign in.</h1>
      </div>
      <Feedback state={state} />
      <input type="hidden" name="next" value={next ?? "/app"} />
      <AuthInput id="email" name="email" type="email" label="Email" autoComplete="email" required />
      <AuthInput id="password" name="password" type="password" label="Password" autoComplete="current-password" required />
      <Submit pending={pending}>Enter ORBIT</Submit>
      <div className="flex justify-between text-[13px] text-muted">
        <Link href="/reset" className="hover:text-warm">
          Forgot password?
        </Link>
        <Link href="/sign-up" className="hover:text-warm">
          Create account →
        </Link>
      </div>
    </form>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpAction, {});
  if (state.recovery) return <RecoveryCard code={state.recovery} onContinue={() => router.push("/app")} cta="I've saved it — continue" />;
  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <p className="label text-muted">Begin</p>
        <h1 className="display mt-4 text-[2.8rem]">Start your orbit.</h1>
      </div>
      <Feedback state={state} />
      <AuthInput id="name" name="name" label="Name" autoComplete="name" placeholder="How should ORBIT greet you?" />
      <AuthInput id="email" name="email" type="email" label="Email" autoComplete="email" required />
      <AuthInput id="password" name="password" type="password" label="Password" autoComplete="new-password" minLength={8} required />
      <Submit pending={pending}>Create account</Submit>
      <p className="text-[13px] text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-warm hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetForm({ mode }: { mode: "local" | "supabase" }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AuthState, FormData>(resetAction, {});
  if (state.recovery) return <RecoveryCard code={state.recovery} onContinue={() => router.push("/sign-in")} cta="Continue to sign in" />;
  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <p className="label text-muted">Recovery</p>
        <h1 className="display mt-4 text-[2.8rem]">Reset password.</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-silver">
          {mode === "local"
            ? "Enter the recovery code you saved when you created your account."
            : "We'll email you a secure link to choose a new password."}
        </p>
      </div>
      <Feedback state={state} />
      <AuthInput id="email" name="email" type="email" label="Email" autoComplete="email" required />
      {mode === "local" ? (
        <>
          <AuthInput id="code" name="code" label="Recovery code" placeholder="XXXXX-XXXXX-XXXXX-XXXXX" autoComplete="off" required />
          <AuthInput id="password" name="password" type="password" label="New password" autoComplete="new-password" minLength={8} required />
        </>
      ) : null}
      <Submit pending={pending}>{mode === "local" ? "Reset password" : "Send reset link"}</Submit>
      <Link href="/sign-in" className="text-[13px] text-muted hover:text-warm">
        ← Back to sign in
      </Link>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePasswordAction, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <h1 className="display text-[2.8rem]">New password.</h1>
      <Feedback state={state} />
      <AuthInput id="password" name="password" type="password" label="New password" autoComplete="new-password" minLength={8} required />
      <Submit pending={pending}>Save and continue</Submit>
    </form>
  );
}
