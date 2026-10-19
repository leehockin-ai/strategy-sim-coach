# Stabilization roadmap

- [x] Stage 0: baseline and compatibility fixtures for all existing statuses/formats; all historical rows unchanged.
- [ ] Browser verification of all historical sessions: requesting user's one owned session passed; remaining sessions require their owners' or authorized reviewer's session. One historical session has no owner; do not reassign it without approval.
- [x] Stage 1: canvas saves and backward status writes cannot regress progress; assignment roll-up verified.
- [x] Diagnose stakeholder persistence; new-session seeds and two real 1:1 turns persist across refresh.
- [x] Restrict hidden-state reads and server reviewer endpoints; candidate denial verified.
- [x] Report changes, root cause, compatibility results and risks; stopped before Stage 2.