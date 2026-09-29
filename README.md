# Airport Cricket

Expo + React Native + TypeScript app (Android/iOS/web) for a morning cricket team. Data is shared live through Firebase (Auth, Firestore, Storage). **No Cloud Functions and no paid Firebase plan are needed** – the free Spark plan is enough.

> This is an Expo project, not Flutter. Build it with EAS (below), not `flutter build apk`.

## What the app does

- **Players**: join with name + date of birth (anonymous Firebase sign-in, remembered on the device). New players are `pending` until an admin approves them; pending players cannot book, captain, join teams or use the tea stall.
- **Booking, captains (max 2/day), teams, tea stall ("Cha er Dokane"), charity wall (₹), birthdays** – all real-time.
- **Admins (max 3)**: on Home, double-tap (or long-press) the red ball at the top right → enter your own player-profile name + the admin password (`732101`). Up to three different names can enrol; a fourth is refused.
  Admin tools: session/match info, **event**, notices, **best shot video (max 3 s) + photo**, approve/reject new players, delete any non-admin player, charity posts, and the **invite link** used by Share.
- **Delete account**: every player can delete their own profile (Profile → Delete my profile). Only admins can delete other players, and never another admin.
- **Share**: Profile → Share Airport Cricket. Set the download link once in Admin → Match → Invite link.

## 1. Firebase setup (free plan)

1. https://console.firebase.google.com → create a project.
2. **Build → Authentication → Get started → Sign-in method → Anonymous → Enable.**
3. **Build → Firestore Database → Create database** (production mode, any region).
4. **Build → Storage → Get started** (production mode).
   (If Storage asks for a paid plan in your region, choose a supported region or upgrade only Storage; everything else stays free.)
5. **Project settings (gear) → Your apps → Add app → Web (`</>`)**. Copy the `firebaseConfig` values.
6. **Firestore → Rules**: paste all of `firestore.rules` → Publish.
   **Storage → Rules**: paste all of `storage.rules` → Publish. If Firebase asks to grant Storage access to Firestore, click **Allow**.
7. That's all – no manual documents are needed. The first time an admin saves settings, `app_settings/main` is created automatically.

## 2. Build the APK on GitHub (no laptop tooling needed)

This repo already has `.github/workflows/build-apk.yml`, which builds the APK
entirely on GitHub's servers. You only need a browser.

**One-time setup:**
1. On GitHub, open this repo → **Settings → Secrets and variables → Actions → New repository secret**.
2. Add these 6 secrets, one at a time, with the values from Firebase console → ⚙ Project settings → Your apps → Web app → `firebaseConfig`:

   | Secret name | firebaseConfig field |
   |---|---|
   | `FIREBASE_API_KEY` | apiKey |
   | `FIREBASE_AUTH_DOMAIN` | authDomain |
   | `FIREBASE_PROJECT_ID` | projectId |
   | `FIREBASE_STORAGE_BUCKET` | storageBucket |
   | `FIREBASE_MESSAGING_SENDER_ID` | messagingSenderId |
   | `FIREBASE_APP_ID` | appId |

   Skip this and the app still installs, but stays in **local-only** mode (a red "Not connected to the team" card appears on Home) — this was the cause of the "no Firebase key" warning: the keys must live here (GitHub secrets), not in `eas.json` — `eas.json` is only read by the separate EAS build path below, never by this workflow.

**Every time you want a new build:**
1. Push any change to the `main` branch (or open the repo's **Actions** tab → **Build Android APK** → **Run workflow**, no code change needed).
2. Wait ~10–15 minutes for the run to go green.
3. Open that run → scroll to **Artifacts** → download **airport-cricket-apk** (a `.zip` containing the `.apk`).
4. Unzip it on your phone or laptop, then install the `.apk` as usual (allow "install unknown apps" if asked).

### Alternative: build locally with EAS (only if you prefer your own laptop)

Install Node.js (LTS), fill in `eas.json`'s `build.preview.env` block with the
same 6 values (`PASTE_HERE` → your Firebase config), then:

```bash
npm install
npx expo install expo-video   # adds the in-app video player (required, once)
npx eas-cli login          # free Expo account (create at expo.dev)
npx eas-cli init           # links the project to YOUR Expo account
npx eas-cli build --platform android --profile preview
```

EAS prints a link/QR to download the `.apk` when it finishes.

Either way: send the APK (or its link) to players, and paste the download
link in **Admin → Match → Invite link** so the in-app Share button sends it.

Local testing without building: `npx expo start`, then open in Expo Go.

## 4. First-time checklist (10 minutes)

1. Install the APK on two phones. Phone A: join as a player. Phone B: join as another player.
2. Phone A: Home → double-tap the red ball → enter your exact name and `732101`. You are admin #1.
3. Phone B should show "Your application is pending". On Phone A: Admin → Requests → Approve. Phone B updates by itself (real-time).
4. Phone B: book tomorrow. Phone A sees the count change immediately.
5. Admin → Media: upload any video (max 25 MB) and a photo. Check the Home "Best shot" card — it should loop the first 3 seconds automatically.
6. Admin → Match: add an event; it appears on Home. Clear event hides it.
7. Phone B: Profile → Delete my profile. Then on A, Admin → Players → delete a player.

## Important limits (please read)

- **Anonymous accounts**: a player who uninstalls, clears app data or changes phone loses their identity and must join again as a new player (an admin can delete the old duplicate). The same applies to admins: if an admin's phone is lost, free the seat in the Firebase console – delete `admin_slots/<1|2|3>` and `admins/<that user's uid>` (the uid is in `admin_slots/<n>.uid`).
- **The admin password is shared and lives in the app (`lib/config.ts`) and in `firestore.rules`.** It stops casual access but a determined person who decompiles the APK could find it. To change it, edit both places, republish the rules, and rebuild.
- Rules protect roles and seats, but counters (slot/captain counts) are updated from the app; this is fine for a friendly club, not for hostile users.
- **Best-shot video**: admins can pick a video of *any* length (up to 25 MB); the Home screen plays only the first 3 seconds and loops that, muted by default (tap the speaker icon for sound). The *entire* file is still uploaded to Storage even though only 3 seconds are shown — this avoids needing a video-trimming native library (the once-standard one, `ffmpeg-kit`, was permanently discontinued in 2025 and its replacements are either iOS-only or too experimental to bake into an untested build). Keep source clips small if your Firebase Storage quota is tight. Plays inside the Home screen via `expo-video`, which the build workflow installs automatically. iPhone `.mov` clips may not play on Android; prefer MP4.
- Players' names, birthdays and phone numbers are visible to all signed-in members.

## Project layout

```
.github/workflows/build-apk.yml   GitHub Actions: builds the APK using repo secrets (primary build path)
App.tsx                 Navigation and auth gate
lib/AppContext.tsx      Auth, real-time streams, booking/teams, admin seats, deletion
lib/config.ts           Admin password, admin limit, history window, best-shot clip length
lib/firebase.ts         Firebase init (reads EXPO_PUBLIC_* keys)
lib/upload.ts           Photo/video pick + upload (25 MB cap; no duration limit on pick)
screens/*               Home, Booking, Teams, Charity, Profile, Admin, editors, auth
firestore.rules         Firestore security rules (publish in console)
storage.rules           Storage security rules (publish in console)
eas.json                Firebase keys for the optional local EAS build path only
```

## Firestore data (short)

`users/{uid}` profile + `approvalStatus`; `admin_slots/{1|2|3}` `{uid,name}`; `admins/{uid}` admin marker; `admin_enroll/{uid}` temporary password proof (unreadable);
`app_settings/main`; `notices`; `charity_posts`; `bookings/{date_uid}`; `booking_counts/{date}`; `captain_assignments/{date_uid}`; `captain_counts/{date}`; `team_memberships/{date_uid}`; `tea_stall_presence/{date_uid}`; `tea_stall_votes/{date_voter_target}`.
