# MalMind for iPhone

The MalMind app, built with Expo (SDK 58) and expo-router. It uses the same
Supabase project as malmind.ai, so a signed-in account sees the same Log on
both surfaces, and the same four demo personas.

## Run it on your iPhone with Expo Go

1. Install **Expo Go** from the App Store.
2. Make sure `mobile/.env.local` exists (copy `.env.example`; the values are
   the website's public `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
3. From this folder:

   ```bash
   npm install
   npx expo start --tunnel ngrok
   ```

   `--tunnel ngrok` lets the phone reach your computer from any network
   (cellular included) without an Expo account; the first run asks to
   install `@expo/ngrok` — answer Y. (Plain `--tunnel` needs `npx expo login`
   first.) If the phone and computer share a Wi-Fi network, plain
   `npx expo start` is faster.

   On Windows PowerShell with scripts disabled, use `npx.cmd` in place of
   `npx`.
4. Scan the QR code with the iPhone **Camera** app and open it in Expo Go.

Pick a persona on the welcome screen to explore with demo data, or sign in
with your malmind.ai email and password. Sign-up and magic links stay on
the website for now.

## What's shared with the website

Pure modules are imported straight from `../src/lib` through the
`@shared/*` alias (Metro watches that folder; see `metro.config.js`):
`demoWorld`, `brainCompose` (the Brain's answers), `volatility`,
`saudiReference`, `ledgerPresets`, `toolbox`, `showcase` (the four
problems played end to end — also malmind.ai/showcase), and
`i18n/dictionaries`.
Keep those files free of web-only imports, and keep their own imports
relative.

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx expo-doctor
```

`npx expo start --web` previews the app in a browser.
