import { cn } from "@/lib/utils";

export function PageHeader({
  index,
  label,
  title,
  description,
  actions,
  className,
}: {
  index?: string;
  label: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-5 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0">
        <p className="label flex items-center gap-3 text-ink-3">
          {index ? <span className="text-ink">{index}</span> : null}
          {index ? <span className="h-px w-6 bg-line-strong" /> : null}
          {label}
        </p>
        <h1 className="mt-3 font-display text-[clamp(1.9rem,3.6vw,2.75rem)] font-bold leading-[1.02] tracking-[-0.035em]">{title}</h1>
        {description ? <p className="mt-2.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Panel({ title, action, children, className, bodyClassName }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface shadow-soft", className)}>
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="label text-ink-2">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageContainer({ children, className, wide }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn("mx-auto w-full px-4 py-6 sm:px-6 md:px-10 md:py-10", wide ? "max-w-[1500px]" : "max-w-6xl", className)}>{children}</div>;
}
