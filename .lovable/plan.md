

## Plan: Visa egen tillståndsdialog varje gång kameran ska öppnas

Operativsystemets tillståndsdialog kan bara visas **en gång** — det går inte att tvinga fram den igen. Lösningen är att visa en **egen in-app-dialog** varje gång användaren trycker på kamera-knappen, som förklarar att appen behöver tillgång till kamera och mikrofon. Först efter att användaren bekräftar öppnas kameran.

Detta uppfyller App Store Guideline 5.1.1(ii) — appen informerar tydligt om varför tillstånd behövs, varje gång.

### Ändringar i `src/pages/ChallengePage.tsx`

1. **Ta bort** den proaktiva `useEffect` (rad 33-39) som kör `getUserMedia` vid sidladdning
2. **Lägg till state** `showPermissionDialog` (boolean)
3. **Lägg till en AlertDialog-komponent** som visas varje gång användaren trycker på kamera-knappen:
   - Titel: "Kamera och mikrofon"
   - Text: "Appen behöver tillgång till din kamera och mikrofon för att ta foto/video som bevis för utmaningen."
   - Knapp "Tillåt" → anropar `getUserMedia({ video: true, audio: true })`, stoppar streamen, sedan öppnar file input
   - Knapp "Avbryt" → stänger dialogen
   - Om `getUserMedia` nekas → visar toast om att slå på tillstånd i enhetens inställningar
4. **Ändra kamera-knappens onClick** (rad 153) från `fileInputRef.current?.click()` till `setShowPermissionDialog(true)`
5. **Importera** `AlertDialog` från `@/components/ui/alert-dialog`

### Flöde

```text
Användare trycker "Öppna kamera"
  → Egen dialog visas: "Appen behöver kamera och mikrofon"
    → Användare trycker "Tillåt"
      → getUserMedia({ video, audio }) körs
        → OS-prompt visas (första gången) ELLER godkänns direkt
          → Kameran öppnas via file input
      → Om nekat: toast "Slå på tillstånd i Inställningar"
    → Användare trycker "Avbryt"
      → Dialogen stängs, inget händer
```

Inga andra filer behöver ändras.

