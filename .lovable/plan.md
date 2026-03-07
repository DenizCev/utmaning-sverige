

## Plan: Uppgradera CI till macOS 26 + Xcode 26

### Bakgrund
GitHub Actions har `macos-26` runners med Xcode 26.2 som default. Detta säkerställer att appen byggs med iOS 26 SDK, vilket App Store kräver.

### Ändringar

**1. `.github/workflows/ios-testflight.yml`**
- `runs-on: macos-14` → `runs-on: macos-26`
- Ta bort steget "Select Xcode" helt (Xcode 26.2 är default på macos-26)

**2. `ios/App/App.xcodeproj/project.pbxproj`**
- Uppdatera `IPHONEOS_DEPLOYMENT_TARGET` från `15.0` till `16.0` i alla build configurations (4 ställen: Debug/Release för projekt + target). iOS 16 är minimikravet för Xcode 26.

Det är allt som behövs. Fastfile, entitlements och resten förblir oförändrade.

