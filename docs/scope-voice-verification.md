# Scope voice isolation and approved journey

## Changes
- VoiceInput previously remained active during stakeholder read-aloud and retained its recognition result-index set across sends. Clearing the text box did not invalidate late recognition callbacks.
- A shared, reference-counted playback gate now pauses every active dictation instance during scoping reply playback and the reusable team read-aloud component. Playback completion, failure, cancellation and unmount release the lock; overlapping playback cannot resume early. Only previously enabled dictation resumes.
- Scoping and 1:1 sends synchronously pause and invalidate recognition before clearing the composer. Successful sends reset again; failed sends restore the original coach draft. New recognition objects have fresh final-result sets, no interim results, and generation checks reject late callbacks.
- Microphone permission requests specify echoCancellation, noiseSuppression and autoGainControl. Permission streams are stopped immediately: Web Speech owns its own audio input and does not expose a portable way to bind the configured stream. These constraints are requested, not claimed guaranteed for the browser recognition engine.
- No server prompts, models, rubric, history or schema changed. Existing 1:1 UI has no automatic read-aloud; its dictation nevertheless observes the shared playback gate and uses the same send reset.

## Live approved session
Created only `4104c942-a9ea-482f-9c77-8a414bd22827` in Lee's account, with candidate label `TEST/NON-PRODUCTION — Lee Hockin — Scope voice verification`. Before you start appeared; Continue created the Student Founder session.

Three typed questions persisted with three stakeholder replies:
1. What decision do you need to make first?
2. What have you heard directly from students?
3. What would useful progress look like in this engagement?

The working view was closed initially and after two questions, opened automatically after the third, and remained open after reload. Composers were empty after successful sends. The first browser script stopped on a duplicate text selector after question one; continuation resumed the same session and did not repeat that question or create another session. Final journey had no browser page errors. No brief edits, assessments or other sessions were changed.

## Voice checks and limitations
- Actual preview scoping and 1:1 screens tested with browser-only simulated recognition/media permission events: playback aborted recognition, stale stakeholder text was rejected, and completion resumed a fresh recognition instance. All three microphone constraints were captured.
- Five domain tests cover overlapping audio, dictation-off/manual-stop behavior, send reset and final/interim rejection, pending permission invalidation and microphone constraints.
- Browser exposes speech synthesis and recognition but lists zero speech voices; no physical speaker-to-microphone echo loop was available. Real audio intelligibility and physical echo suppression remain unverified; simulated checks are not presented as physical audio proof.
- 356 tests passed, 5 opt-in tests skipped; preview build OK. No publishing.