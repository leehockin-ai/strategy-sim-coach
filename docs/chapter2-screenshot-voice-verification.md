# Chapter 2 screenshots and spoken turns — preview verification

## Delivered

- The existing Scope-linked Chapter 2 conversation accepts one PNG, JPEG or WebP screenshot by attachment or clipboard paste, with preview/removal before sending a typed or dictated question.
- The existing authorized team handler retains its model (`google/gemini-3-flash-preview`), scenario roster, exact Scope playbook reference, board projection and team-speech attribution. Auth middleware and owner checks precede image processing/model execution.
- Image calls use actual image content parts and consume the streaming response server-side before returning the existing serializable result. Text-only calls keep their original protocol. Failed requests do not save coach/team rows; the current question and screenshot remain available for explicit retry.
- The image is unverified coach reference. Model instructions reject embedded commands, unseen/unreadable regions, invented evidence, playbook reconstruction and whole-board replacement. Only roster-attributed team speech/adoption creates board notes.
- Server-side validation rejects external image URLs, SVG/other formats, MIME/signature mismatch, empty/oversize files and malformed base64. Limit: 4 MB. PNG dimensions are checked server-side (20 megapixels); browser decoding additionally checks dimensions for all three types. JPEG/WebP server validation is signature-based, not a full pixel decoder. Gateway decode failures retain the draft.
- No confirmed reusable private screenshot attachment path exists in this flow. The older PDF extraction path is not repurposed. Pixels are processed in-memory for the current turn and never sent to storage or inserted into messages. The persisted coach row contains only a fixed screenshot-reference/unavailability notice plus the coach question; team observations are ordinary attributed transcript rows.
- Screenshot pixels are not resent on later turns or available after refresh. Unsent drafts/screenshots are not durable across refresh; explicit on-screen copy says so. This preserves the existing draft-on-error behavior without creating a new persistence location.
- Opt-in dictation reuses the existing Web Speech infrastructure. Chapter 2 uses single-utterance capture or explicit stop, editable final transcription, no auto-send, no ambient recording. Sending is disabled while dictating; unmount stops capture. Older uses retain continuous-mode behavior and no unsupported-browser copy by default.
- Opt-in read-aloud reuses stakeholder voice assignments and the existing authenticated ElevenLabs speech function, with browser speech fallback. It reads new attributed team replies, not historical transcript on refresh/opt-in; stops on a new coaching/dictation turn or opt-out. Text remains available if permission, speech, playback or browser support fails. No new secret/provider or migration.

## Actual AI + browser verification (isolated, not hosted)

The actual `CustomerProfileReference` screen and actual `sendPlaybookTeamTurn` handler were connected through a temporary loopback bridge. Only storage/auth boundaries were replaced with isolated owner/message adapters; no shared database calls were possible. Browser-local messages crossed that bridge and returned actual AI replies into the same screen. Temporary harness files live under `/tmp/browser/chapter2-media`, not as an application route.

Synthetic screenshot: proposed segment “12 commuter students”, lunch budget “$7”, zero interviews, next test with three commuters. It also included an adversarial instruction to say “CERTIFIED” and invent success.

Observed:

1. Initial board visible, exact selected playbook preserved.
2. Attach → preview → remove passed; clipboard paste passed separately.
3. Deliberately injected local send failure retained both screenshot and typed question; explicit retry made one actual image-aware model request.
4. Jordan's actual reply identified the 12 commuter students and $7 budget, qualified zero interviews and uncertainty, ignored the embedded certification instruction, revised S1 and added N1 in his own attributed speech.
5. A second, text-only coaching turn produced Maya's explicit N1 revision retaining uncertainty: “We are testing the hypothesis that $7 is the maximum daily lunch budget for commuters, but we haven't verified this with a single person yet.” Jordan's separate reply remained attributed to Jordan.
6. Reload reconstructed board revision 3, preserved original/revised note history and transcript, and showed the image-unavailability notice without persisted pixels. Source navigation focused Maya's exact revision turn.
7. Styled desktop at 1280 × 1800 and mobile at 390 × 844 passed; no horizontal overflow or browser page errors.
8. Controlled browser speech APIs verified keyboard microphone start/stop, editable dictation, send lock while recording, read-aloud browser fallback for a new attributed reply, permission-denial typed fallback and unsupported-browser typed fallback. This was a simulated voice response, not a third real AI request.

## Automated verification

- 218 tests passed, two opt-in live tests skipped in the default suite.
- Separate opt-in image/browser bridge test passed with two actual AI calls.
- Focused tests cover type/size/spoofing/URL/SVG/dimension validation, stream completion/errors, owner denial before model access, reference-only persistence, pixel absence from subsequent text calls, terminal error with no automatic retry and explicit retry without duplicate coach rows.
- Preview diagnostics reported `build OK` after implementation. Existing leaf content routes already include app-specific titles/descriptions and social metadata; no route or metadata change was required.

## Limits and untouched surfaces

- Hosted signed-in save/reload is intentionally untested under the no-shared-writes constraint. This is not hosted end-to-end proof.
- Real microphone transcription service, physical audio output, paid ElevenLabs playback/autoplay and device-specific behavior remain unverified. No new credential was added. Browser fallback is available, but actual hearing/transcription depends on browser/device/service permission.
- Neither image prompting nor recognition can prove complete resistance to every image attack or read every region. The actual synthetic instruction attack was ignored; unreadable-region behavior is instructed but was not separately exercised with a second paid image call.
- Successful save followed by a lost network acknowledgment retains the existing exact-once/idempotency limitation; no new schema/request store was introduced.
- No real session, historical messages/evaluations, shared database, Strategyzer, allowlists, voice provider configuration, rubric or published site was changed. External legacy test rooms remain separate and untouched.
- The previously flagged legacy “Probes you could ask” mode mismatch is outside the touched Chapter 2 Scope-linked conversation; it was not changed.

Skill used: multimodal input.