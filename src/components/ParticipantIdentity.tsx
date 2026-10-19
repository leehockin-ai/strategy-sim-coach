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
  className,
}: {
  participant: ParticipantIdentityInput;
  size?: "sm" | "md" | "lg";
  showDescription?: boolean;
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
          className={cn(avatarPx, "rounded-full object-cover border border-ink/20 shrink-0")}
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
          <span className="block truncate text-[11px] text-muted-foreground">{id.role}</span>
        ) : null}
        {showDescription && id.description ? (
          <span className="block text-[11px] text-muted-foreground mt-0.5">{id.description}</span>
        ) : null}
      </span>
    </span>
  );
}
