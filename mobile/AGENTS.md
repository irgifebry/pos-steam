This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- This app uses **React Navigation v7**, not Expo Router. `expo-router` is intentionally NOT installed.
- Navigators live in `src/navigation/`: `RootNavigator.tsx` (native stack) and `BottomTabNavigator.tsx` (bottom tabs). Route param types are in `src/navigation/types.ts`.
- Screens live in `src/screens/`; settings sub-screens are under `src/screens/settings/`. Reusable components in `src/components/`, shared theme in `src/theme/`.
- There are 4 tabs: **Kasir, Antrean, Laporan, Pengaturan**. Admin user management lives in the Pengaturan tab.
- Use `useNavigation<NativeStackNavigationProp<RootStackParamList>>()` and `navigation.navigate(...)` for screen transitions. Native stack headers provide platform back buttons.
- Theme: **light mode only**. Use `useTheme()` / `useStyles()` from `src/theme/`; do not reintroduce a dark palette or a mode toggle.
- Docs (React Navigation): https://reactnavigation.org/docs/getting-started

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
- `npx expo lint` requires an ESLint config that this project does not currently have; `npx tsc --noEmit` and `npx expo-doctor` are the enforced checks.
- API base URL is resolved in `src/lib/storage.ts`. `EXPO_PUBLIC_API_BASE_URL` takes precedence — **set it for production builds/EAS updates** (e.g. `https://<backend>.vercel.app`). Without it, dev fallback is `http://localhost:3001` on web (cookie `SameSite=Lax`), otherwise derived from Expo `hostUri` with a hardcoded LAN fallback that must be updated when the network changes. The backend CORS proxy lives at `src/proxy.ts` in the repo root.
- The repo root is an **API-only Next.js backend** (no Next.js web frontend). API route handlers live in `src/app/api/**` under the repo root, shared logic/services in `src/lib/**`; this Expo app is the only client. When an API contract changes, update `docs/backend/README.md` in the repo root.
- Current build config: `android.package` / `ios.bundleIdentifier` are `com.kyane.pos`; `userInterfaceStyle` is `light`. Native bottom tabs were tried and reverted — keep `createBottomTabNavigator`.
