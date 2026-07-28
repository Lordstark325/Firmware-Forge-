# Firmware Forge

Windows-first desktop firmware workbench. Version 0.1 supports ESP32-family boards connected through a USB serial/JTAG bridge.

## Capabilities

- Discover serial ports and inspect an ESP chip before writing.
- Back up the complete flash to a `.bin` file and calculate SHA-256.
- Flash a local image at an explicit offset with esptool verification.
- Erase is available in the backend but intentionally not exposed in the first UI.
- Read a live 115200-baud serial console for boot and firmware testing.
- Blocks flashing until device inspection and explicit user confirmation.
- Detects and inspects Android phones through ADB, including build, security patch, Verified Boot and battery state.
- Streams Android logcat, installs APKs, and reboots into recovery or bootloader mode.
- Detects Fastboot devices and flashes one explicitly selected, allowlisted partition.
- Watches for connection changes every three seconds and classifies Android, probable ESP serial adapters, possible router/modem devices, and unknown USB hardware.
- Treats USB metadata as a candidate classification only; ESP devices require a read-only esptool inspection before writes, and routers require a model-specific adapter.

## Development

```powershell
python -m pip install --user esptool
npm install
npm run dev
```

Android support requires Google Android SDK Platform Tools (`adb` and `fastboot`) on PATH. Enable USB debugging and approve the computer on the phone. Windows may also need the manufacturer's USB driver.

Build a Windows installer with `npm run desktop:build`.

## Important limitations

- A USB-C connector does not imply a common firmware protocol. This release supports ESP chips through esptool only.
- Full flash backup size must match the device (2/4/8/16 MB).
- A raw flash backup may contain Wi-Fi credentials, encryption material, calibration data, and personal information. Store it securely.
- ESP32 Secure Boot or Flash Encryption can restrict useful backups and updates.
- Routers require a model-specific signed adapter, vendor recovery mode, or authenticated management API. Generic router write support would be unsafe.
- Only flash hardware you own or are authorized to manage.
- Modern Android phones do not allow a universal full-firmware backup. Raw partition access normally requires elevated privileges, and unlocking a bootloader commonly erases user data.
- Fastboot requires the exact image for the phone model, region and build. Firmware Forge does not bypass bootloader locks, Factory Reset Protection, Verified Boot or vendor signatures.

## Planned adapter contract

Every new device family should implement `discover`, `inspect`, `backup`, `validateImage`, `flash`, `verify`, and `recover`, with model allowlists and vendor-signature validation where available.
