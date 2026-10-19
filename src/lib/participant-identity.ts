// Persistent participant identity helpers.
//
// Participants must feel like the same people wherever they appear —
// Client Brief, Scope conversations, Live Client Team. Identity is derived
// deterministically from participant configuration (name/role/description/
// optional portrait); nothing is hard-coded to any scenario, and imagery is
// never a dependency: without a configured portrait, a stable initials +
// color fallback is used.

export type ParticipantIdentityInput = {
  name: string;
  role?: string;
  description?: string;
  portrait?: string;
};

// Deterministic hash of a name → stable index into the palette.
export function identityHash(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Muted, Strategyzer-compatible palette (works on light paper background).
export const IDENTITY_PALETTE = [
  "#2f4858", // deep slate
  "#4f6d7a", // steel blue
  "#6b5b73", // muted plum
  "#556b2f", // olive
  "#8a5a44", // warm umber
  "#3d5a80", // navy
  "#715a3a", // bronze
  "#475569", // slate gray
] as const;

export function identityColor(name: string): string {
  return IDENTITY_PALETTE[identityHash(name) % IDENTITY_PALETTE.length];
}

export function identityInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function resolveIdentity(input: ParticipantIdentityInput): {
  name: string;
  role?: string;
  description?: string;
  portrait?: string;
  initials: string;
  color: string;
} {
  return {
    name: input.name,
    role: input.role,
    description: input.description,
    portrait: input.portrait,
    initials: identityInitials(input.name),
    color: identityColor(input.name),
  };
}
