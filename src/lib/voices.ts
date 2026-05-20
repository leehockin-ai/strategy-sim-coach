// ElevenLabs voice assignments for simulated stakeholders.
// Voices chosen for distinct character + accent variety.
export const STAKEHOLDER_VOICES = [
  "EXAVITQu4vr4xnSDxMaL", // Sarah — warm female
  "JBFqnCBsd6RMkjVDRZzb", // George — measured male
  "XB0fDUnXU5powFXDhCwa", // Charlotte — sharp female
  "TX3LPaxmHKxFdv7VOQHJ", // Liam — younger male
  "pFZP5JQG7iQjIQuC4Bku", // Lily — softer female
  "nPczCjzI2devNBz1zQrb", // Brian — gravelly male
];

export function voiceForStakeholder(stakeholders: { name: string }[], name: string): string {
  const idx = Math.max(0, stakeholders.findIndex((s) => s.name === name));
  return STAKEHOLDER_VOICES[idx % STAKEHOLDER_VOICES.length];
}
