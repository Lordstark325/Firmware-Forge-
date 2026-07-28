# Firmware Forge

Firmware Forge is a private-first firmware workbench for identifying, inspecting, testing, backing up, and updating authorized hardware.

This repository contains two applications:

- [`desktop/`](desktop/) — Windows-oriented Electron workbench for ESP32, Android ADB/Fastboot workflows, serial monitoring, and automatic USB classification.
- [`android/`](android/) — sideload-only Android companion for USB-OTG device detection, safe device classification, USB permission handling, firmware selection, and SHA-256 verification.

## Current support

### ESP32 desktop workflow

- Serial-port discovery and probable ESP bridge classification.
- Read-only chip and MAC inspection through Espressif `esptool`.
- Full flash backup with SHA-256 calculation.
- Verified binary flashing at an explicit offset.
- Live serial monitoring.
- Confirmation gates before firmware writes.

### Android desktop workflow

- ADB and Fastboot detection.
- Build, model, Android version, security patch, battery, and Verified Boot inspection.
- Logcat streaming and APK installation.
- Reboot into recovery or bootloader.
- Guarded Fastboot writes to an explicit partition allowlist.

### Android mobile workflow

- Automatic USB-OTG device detection.
- Classification of common ESP serial bridges, modem/router interfaces, storage, and unknown devices.
- Android USB permission requests.
- Firmware selection using Android's Storage Access Framework.
- Local SHA-256 calculation.
- Temporary pairing token and local-network gateway service.
- Authenticated USB byte bridge for a paired desktop.
- Desktop-routed ESP inspection, backup, write, and verification through the phone.

The phone gateway currently supports probable ESP serial adapters that expose compatible bulk endpoints. Some boards require manual BOOT/RESET entry, and CP210x/CH340 variants may need additional Android driver initialization. Keep the phone and desktop on the same trusted local network; pairing is authenticated with a temporary token but the current local transport is not TLS-encrypted.

Router detection is available through the gateway, but router firmware writes remain intentionally locked until a manufacturer/model adapter validates the image, upgrade protocol, and recovery method.

## Safety boundaries

- Only operate on devices you own or are authorized to manage.
- USB-C is a connector, not a universal firmware protocol.
- Unknown devices are read-only.
- Routers require model-specific adapters and vendor validation.
- Firmware Forge does not bypass bootloader locks, Factory Reset Protection, Verified Boot, flash encryption, Secure Boot, or vendor signatures.
- Raw backups can contain credentials, calibration data, encryption material, and personal information. They are excluded from Git by default.
- APKs and signing keys are build artifacts and must not be committed.

## Desktop development

Requirements: Node.js 20+, Python 3.10+, and `esptool`. Android management additionally requires Google Android SDK Platform Tools on `PATH`.

```powershell
cd desktop
python -m pip install --user esptool
npm install
npm run dev
```

Build a Windows installer with:

```powershell
npm run desktop:build
```

## Android development

Open [`android/`](android/) in Android Studio with JDK 17 and Android SDK 35 installed, then build the debug APK:

```powershell
cd android
./gradlew assembleDebug
```

The APK is designed for direct internal sideloading; publication through Google Play is not required.

## Repository layout

```text
Firmware-Forge-
├── desktop/   Electron + React desktop application
└── android/   Native Android USB-OTG companion
```

## Status

Firmware Forge is under active development. Treat firmware-writing features as engineering tools, validate images independently, and keep a tested recovery path for every supported device model.
