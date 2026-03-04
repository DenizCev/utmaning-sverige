## Plan: Byt till `@capgo/capacitor-health` — GENOMFÖRD

Plugin bytt från `capacitor-health` (v7) till `@capgo/capacitor-health` (Capacitor 8-kompatibelt).

### Genomförda ändringar
1. **package.json** — `capacitor-health` borttagen, `@capgo/capacitor-health` tillagd
2. **src/utils/healthSteps.ts** — Alla API-anrop migrerade till nytt plugin (`CapacitorHealth`)
3. Fastfile, workflow, entitlements — oförändrade (redan korrekta)

### Nästa steg (lokalt)
1. `git pull`
2. `npm install`
3. `npm run build`
4. `npx cap sync ios`
5. `git push` → trigga GitHub Actions workflow
