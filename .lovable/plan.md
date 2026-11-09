# Voice stack inventory and reuse audit (read-only findings)

No code, database, session, assessment or permission changes were made. Nothing below is implemented yet; approving only records these findings. A separate go-ahead is needed before any voice work.

## What exists today

| Piece | File | Status |
|---|---|---|
| Spoken replies (ElevenLabs, model `eleven_turbo_v2_5`, MP3 returned as base64) | `src/lib/voice.functions.ts` → `synthesizeVoice` | Implemented. Signed-in users only. Text capped at 2,000 characters. Falls back on 401/402/429/5xx. |
| Six stakeholder voices (Sarah, George, Charlotte, Liam, Lily, Brian), chosen by stakeholder position | `src/lib/voices.ts` → `voiceForStakeholder` | Implemented. Note: Charlotte (`XB0fDUnXU5powFXDhCwa`) is not in the current recommended voice list, so it may not exist; unverified. |
| Browser voice fallback (`speechSynthesis`, one generic voice) | `sessions.$sessionId.tsx` → `speakWithBrowser` (~line 357) | Implemented |
| Microphone dictation (browser Web Speech API, click to start and stop, final results only, appended to a text box) | `src/components/VoiceInput.tsx` | Implemented. Chrome, Edge and Safari only. It hides itself on Firefox, so there is no mic there. |

## Where it is wired up

- **Old Chapter 1 scoping call** (`FramingStep`, ~lines 440–613): this is the only place with spoken replies. `playReply` calls `synthesizeVoice`, plays the audio, and falls back to the browser voice. Each reply still needs a typed or dictated message plus a Send click. There is no auto-listen after a reply.
- **Mic dictation buttons (`VoiceInput`)**:
  - Scoping call (613), MethodStep rationale (975), the old 1:1 DialogueStep (1107), InterventionStep (3452) and Engagement Orchestration (3644).
  - Reviewer notes (`_authenticated.reviewer.tsx` 752, 769) and scenario naming (`_authenticated.scenarios.tsx` 144).
  - DialogueStep (old 1:1 conversations) has dictation but no spoken replies.
- **New Live Client Team** (`src/components/LiveClientTeam.tsx`): text only. No mic, no `VoiceInput` and no spoken replies. Messages are sent by clicking "Speak to the room" or pressing Ctrl/Cmd+Enter.

## Credentials and service connections (presence only)

- ElevenLabs key: **set** as a project secret. No ElevenLabs workspace connector is linked (the connection list is empty), so it is a manually added key.
- Lovable AI key: **set**. This already covers speech-to-text through the built-in AI service, so no new provider is needed.
- OpenAI and Deepgram keys: not set.
- `package.json` has no voice SDK (no ElevenLabs React package, LiveKit, Deepgram or AssemblyAI). There is no audio server route under `src/routes/api` and no `MediaRecorder` or `getUserMedia` use in the code.
- No other continuous-audio integration was found in the code or settings.

## Tests

None of the 118 tests cover voice, dictation or text-to-speech. Spoken replies, the fallback and dictation are all **untested** and were not run in a browser in this audit. Headless Chromium has no microphone, and calling ElevenLabs would spend credits.

## Gaps and risks

1. **Mic reliability.** The Web Speech API sends audio to the browser vendor. It is missing on Firefox, stops silently after a pause or a network error (`onerror` and `onend` just turn the button off with no message), and gives no live preview because interim results are off. A permission denial shows nothing. This is the likely cause of the "mic doesn't work" reports.
2. **Too many clicks.** Each turn is: click mic, speak, click mic, click Send. There is no hands-free option.
3. **Live team has no voice at all.** The new Chapter 2 room is less capable than the old scoping call.
4. **Audio autoplay.** `a.play()` runs after a server round-trip, which browsers may block, especially Safari. On a block it drops to the browser voice, which sounds generic, rather than offering a "tap to hear" button.
5. **Turn-taking.** There is no stop or skip control for playback. A new reply calls `pause()` on the old audio, but the browser voice keeps talking. The mic is not paused while the client speaks, so it could pick up the speakers.
6. **Cost.** Every reply is converted to speech with no caching. The live team can return several speakers per turn, which means several ElevenLabs calls.
7. **Security.** The voice function requires sign-in but has no owner or session check and accepts any voice ID, so any signed-in user can spend ElevenLabs credits on arbitrary text up to 2,000 characters.
8. **Voice consistency.** `voiceForStakeholder` picks voices by position in the list. The live team uses participant identities from a different source, so voices could change between chapters.

## Smallest reuse-based approach (recommendation only)

1. **Fix the mic without a new provider.**
   - Harden `VoiceInput`: show permission and network errors, turn on interim preview text, restart after a pause until the user stops, and offer an optional "send when I stop talking".
   - For Firefox and as a fallback: record a short clip in the browser and transcribe it with the built-in Lovable AI speech-to-text through a new owner-checked server function. No new provider is needed.
2. **Reduce clicking.**
   - Add `VoiceInput` to `LiveClientTeam` next to "Speak to the room".
   - Add a "hands-free" toggle: after the client finishes speaking, the mic reopens; when the coach stops talking, the message sends.
3. **Spoken replies in the live team: feasible with the existing ElevenLabs function.**
   - Reuse `synthesizeVoice` plus the `playReply` pattern, moved into a shared hook.
   - Play team responses one after another, mapped to stable voices by participant name.
   - Add a mute toggle (off by default), a "tap to play" button when autoplay is blocked, and a stop button.
   - Tighten `synthesizeVoice`: only allow the six voice IDs and require an owned session.
4. **Tests:** cover the voice ID allowlist, the owner check, fallback selection, playback queue order, and the autoplay-blocked path. Browser mic flows still need a manual check on a real device.

Continuous two-way live voice (a streaming session) is possible later through the built-in AI live-voice service, but it is a larger change than these steps.
