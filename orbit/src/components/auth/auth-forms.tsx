"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { armWarpArrival, finishWarp, playWarp } from "@/components/fx/warp";
import { Check, Copy } from "lucide-react";
import { resetAction, signInAction, signUpAction, updatePasswordAction, type AuthState } from "@/server/actions/auth";
import { OrbitPulse } from "@/components/brand/logo";
import { useI18n } from "@/lib/i18n/client";

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
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <div className="animate-rise">
      <p className="label text-muted">{t.auth.recoveryLabel}</p>
      <h1 className="display mt-4 text-[2.6rem]">{t.auth.recoveryTitle}</h1>
      <p className="mt-4 text-[14px] leading-relaxed text-silver">
        {t.auth.recoveryText}
      </p>
      <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-4">
        <code className="font-mono text-[15px] tracking-[0.12em] text-warm">{code}</code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(code).then(() => setCopied(true)).catch(() => undefined);
          }}
          aria-label={t.auth.recoveryCopy}
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
  const { t } = useI18n();
  const a = t.auth;
  const [state, action, pending] = useActionState<AuthState, FormData>(signInAction, initialError ? { error: initialError } : {});
  useEffect(() => {
    if (state.error || state.message) finishWarp();
  }, [state]);
  return (
    <form action={action} onSubmit={armWarpArrival} className="flex flex-col gap-5">
      <div>
        <p className="label text-muted">{a.welcome}</p>
        <h1 className="display mt-4 text-[2.8rem]">{a.signInTitle}</h1>
      </div>
      <Feedback state={state} />
      <input type="hidden" name="next" value={next ?? "/app"} />
      <AuthInput id="email" name="email" type="email" label={a.email} autoComplete="email" required />
      <AuthInput id="password" name="password" type="password" label={a.password} autoComplete="current-password" required />
      <Submit pending={pending}>{a.enter}</Submit>
      <div className="flex justify-between text-[13px] text-muted">
        <Link href="/reset" className="hover:text-warm">
          {a.forgot}
        </Link>
        <Link href="/sign-up" className="hover:text-warm">
          {a.createLink}
        </Link>
      </div>
    </form>
  );
}

export function SignUpForm() {
  const { t } = useI18n();
  const a = t.auth;
  const L = t.common.legal;
  const router = useRouter();
  const [state, action, pending] = useActionState<AuthState, FormData>(signUpAction, {});
  useEffect(() => {
    if (state.error || state.message || state.recovery) finishWarp();
  }, [state]);
  if (state.recovery)
    return (
      <RecoveryCard
        code={state.recovery}
        onContinue={() => {
          playWarp({ label: "Entering your universe" });
          router.push("/app");
        }}
        cta={a.recoveryCta}
      />
    );
  return (
    <form action={action} onSubmit={armWarpArrival} className="flex flex-col gap-5">
      <div>
        <p className="label text-muted">{a.begin}</p>
        <h1 className="display mt-4 text-[2.8rem]">{a.signUpTitle}</h1>
      </div>
      <Feedback state={state} />
      <AuthInput id="name" name="name" label={a.name} autoComplete="name" placeholder={a.namePh} />
      <AuthInput id="email" name="email" type="email" label={a.email} autoComplete="email" required />
      <AuthInput id="password" name="password" type="password" label={a.password} autoComplete="new-password" minLength={8} required />
      <fieldset className="rounded-xl border border-white/12 px-4 pb-3 pt-1">
        <legend className="label px-1 text-muted">{a.ageLegend}</legend>
        <label className="flex cursor-pointer items-start gap-3 py-1.5 text-[13.5px] leading-snug text-silver">
          <input type="radio" name="age" value="16plus" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#f5f3ef]" />
          <span>{a.age16}</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 py-1.5 text-[13.5px] leading-snug text-silver">
          <input type="radio" name="age" value="13to15" className="mt-0.5 h-4 w-4 shrink-0 accent-[#f5f3ef]" />
          <span>{a.age13}</span>
        </label>
        <p className="pt-1 text-[11.5px] text-muted">{a.under13}</p>
      </fieldset>
      <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-snug text-silver">
        <input type="checkbox" name="terms" value="yes" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#f5f3ef]" />
        <span>
          {a.agree1}{" "}
          <Link href="/terms" target="_blank" className="text-warm underline underline-offset-4">
            {L.terms}
          </Link>{" "}
          {a.and}{" "}
          <Link href="/privacy" target="_blank" className="text-warm underline underline-offset-4">
            {L.privacy}
          </Link>
          {a.agree2}
        </span>
      </label>
      <Submit pending={pending}>{a.create}</Submit>
      <p className="text-[13px] text-muted">
        {a.have}{" "}
        <Link href="/sign-in" className="text-warm hover:underline">
          {a.signInLink}
        </Link>
      </p>
    </form>
  );
}

export function ResetForm({ mode }: { mode: "local" | "supabase" }) {
  const { t } = useI18n();
  const a = t.auth;
  const router = useRouter();
  const [state, action, pending] = useActionState<AuthState, FormData>(resetAction, {});
  if (state.recovery) return <RecoveryCard code={state.recovery} onContinue={() => router.push("/sign-in")} cta={a.toSignIn} />;
  return (
    <form action={action} className="flex flex-col gap-5">
      <div>
        <p className="label text-muted">{a.resetLabel}</p>
        <h1 className="display mt-4 text-[2.8rem]">{a.resetTitle}</h1>
        <p className="mt-3 text-[14px] leading-relaxed text-silver">
          {mode === "local"
            ? a.resetLocal
            : a.resetEmail}
        </p>
      </div>
      <Feedback state={state} />
      <AuthInput id="email" name="email" type="email" label={a.email} autoComplete="email" required />
      {mode === "local" ? (
        <>
          <AuthInput id="code" name="code" label={a.code} placeholder="XXXXX-XXXXX-XXXXX-XXXXX" autoComplete="off" required />
          <AuthInput id="password" name="password" type="password" label={a.newPassword} autoComplete="new-password" minLength={8} required />
        </>
      ) : null}
      <Submit pending={pending}>{mode === "local" ? a.resetBtn : a.sendLink}</Submit>
      <Link href="/sign-in" className="text-[13px] text-muted hover:text-warm">
        {a.back}
      </Link>
    </form>
  );
}

export function UpdatePasswordForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePasswordAction, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <h1 className="display text-[2.8rem]">{t.auth.updateTitle}</h1>
      <Feedback state={state} />
      <AuthInput id="password" name="password" type="password" label={t.auth.newPassword} autoComplete="new-password" minLength={8} required />
      <Submit pending={pending}>{t.auth.save}</Submit>
    </form>
  );
}
