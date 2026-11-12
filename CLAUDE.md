# discord-speech-recognition

discord.js v14 extension that emits a `speech` event with transcribed voice-channel audio. Published to npm as a dual CJS/ESM package.

## Commands

- `npm ci` — install (Node >= 22.12, building needs >= 22.18)
- `npm run lint` — oxlint (type-aware) + oxfmt check on `src/` and `tests/` + `tsc --noEmit`
- `npm run lint:fix` — autofix lint and formatting
- `npm run build` — tsdown → `dist/` (CJS + ESM + d.ts)
- `npm run test:unit` — offline, about 2 seconds; run this while iterating
- `npm run test:integration` — real services, about 3 minutes; run a single file instead: `npx vitest run tests/integration/speechOptions.test.ts`
- `npm run doc` — typedoc → `generated_docs/`

The husky pre-push hook runs `npm run lint`.

## Layout

- `src/index.ts` — public exports
- `src/bot/addSpeechEvent.ts` — entry point, merges options and wires events
- `src/bot/events/voiceJoin.ts` — finds the voice connection on `voiceStateUpdate`, emits `voiceJoin` once per connection
- `src/bot/events/speech.ts` — records speaking users, emits `speech` and `audioStreamError`
- `src/bot/voiceMessage/` — `VoiceMessage` and the function that runs speech recognition
- `src/speechRecognition/` — recognizers (`googleV2.ts`, `witai.ts`)
- `src/utils/` — PCM/WAV helpers and the opus decoder wrapper
- `tests/unit/` — offline tests; `speechEvent.test.ts` drives the whole pipeline with a fake client and real opus packets
- `tests/integration/` — tests against Google, wit.ai and Discord; `tests/utils/TestManager.ts` drives two real bots

## Tests and secrets

Integration tests that need secrets are skipped when they aren't set. `.env` (copy of `.env.example`) holds `BOT_TOKEN`, `TESTBOT_TOKEN`, `GUILD_ID` and `WITAI_KEY`.

- Both bots are shared by all integration tests, so test files never run in parallel (`fileParallelism: false`).
- Joining a voice channel right after leaving it is unreliable; use `TestManager.leaveVoiceChannels`, which waits a moment.
- `Cannot perform IP discovery - socket closed` comes from `@discordjs/voice` when a connection is destroyed while connecting. It usually means two processes use the same bots.

## How recording works

`@discordjs/voice` emits `speaking` `start` only for the first packet after a pause of 100ms. A user that transmits without pauses never emits it again, so `speech.ts` starts the next recording itself when the audio stream closes and the user is still in `receiver.speaking.users`.

## Conventions

- HTTP via built-in global `fetch`; do not add axios / node-fetch.
- `discord.js` and `@discordjs/voice` are peer dependencies. `@discordjs/opus` and `opusscript` are optional peers, `prism-media` picks whichever is installed.
- Keep `SpeechEvents` a const object, not an enum (ESM compatibility).
- The package doesn't manage the voice connection (no rejoin, no destroy); that belongs to the bot.
- User-facing changes go to `CHANGELOG.md`.
