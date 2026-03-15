

## Plan: Proaktiv kamera-tillståndsfråga

### Vad
Be om kameraåtkomst tidigt — t.ex. när användaren öppnar en utmaning med foto/video-bevis — istället för att vänta tills de trycker på uppladdningsknappen. Detta ger en bättre upplevelse och undviker att Apple avvisar appen för att permission-prompten inte visas i rätt kontext.

### Hur

**`src/pages/ChallengePage.tsx`**
- Lägg till en `useEffect` som körs när sidan laddas (och `challenge.proof_type` är `photo` eller `video`)
- Anropar `navigator.mediaDevices.getUserMedia({ video: true })` för att trigga browser/native permission-dialogen
- Stänger streamen direkt efteråt (vi behöver inte den, bara trigga prompten)
- Fångar eventuella fel tyst (användaren kan neka)

```typescript
useEffect(() => {
  if (challenge && challenge.proof_type !== 'text') {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => stream.getTracks().forEach(t => t.stop()))
      .catch(() => {});
  }
}, [challenge]);
```

Ingen databasändring behövs. En liten kodändring i en fil.

