import { resolveIdentity, type ParticipantIdentityInput } from "@/lib/participant-identity";
import { cn } from "@/lib/utils";

// Persistent participant identity: avatar (configured portrait or a
// deterministic initials fallback), name, role and optional public
// description. Renders from participant configuration only — never
// hard-coded to any scenario, and never dependent on imagery.
export function ParticipantIdentity({
  participant,
  size = "md",
  showDescription = false,
  dark = false,
  className,
}: {
  participant: ParticipantIdentityInput;
  size?: "sm" | "md" | "lg";
  showDescription?: boolean;
  /** Use on colored/dark surfaces (e.g. the Client Brief header). */
  dark?: boolean;
  className?: string;
}) {
  const id = resolveIdentity(participant);
  const avatarPx = size === "lg" ? "h-12 w-12 text-sm" : size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <span className={cn("inline-flex items-center gap-2.5 min-w-0", className)}>
      {id.portrait ? (
        <img
          src={id.portrait}
          alt=""
          className={cn(avatarPx, "rounded-full object-cover border shrink-0", dark ? "border-paper/40" : "border-ink/20")}
        />
      ) : (
        <span
          aria-hidden
          className={cn(avatarPx, "rounded-full shrink-0 inline-flex items-center justify-center font-medium text-paper")}
          style={{ backgroundColor: id.color }}
        >
          {id.initials}
        </span>
      )}
      <span className="min-w-0 leading-tight">
        <span className={cn("block truncate font-medium", size === "sm" ? "text-xs" : "text-sm")}>{id.name}</span>
        {id.role ? (
          <span className={cn("block truncate text-[11px]", dark ? "opacity-70" : "text-muted-foreground")}>{id.role}</span>
        ) : null}
        {showDescription && id.description ? (
          <span className={cn("block text-[11px] mt-0.5", dark ? "opacity-80" : "text-muted-foreground")}>{id.description}</span>
        ) : null}
      </span>
    </span>
  );
}
