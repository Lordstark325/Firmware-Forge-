# Firmware Forge Mobile

Private, sideload-only Android companion. It requires a phone with USB Host/OTG support and a data-capable cable or OTG adapter.

Version 0.4 detects USB devices, classifies common ESP serial bridges and modem/router USB interfaces, requests Android USB permission, selects firmware through the Storage Access Framework, and calculates SHA-256 locally. It can also expose an authenticated local control service and USB byte bridge so the paired desktop app can route ESP inspection, backup, flashing, and verification through the phone. Backups made through the gateway are automatically catalogued by Firmware Forge Desktop 0.6 or newer, where the recovery image can be exported and a Device Assessment PDF can be downloaded.

Start the gateway in the app, then enter the displayed phone IP and temporary pairing token in the desktop **Phone gateway** screen. Use a trusted local network. The pairing token authenticates the session, but this first local bridge is not TLS-encrypted.

The USB bridge requires compatible bulk endpoints. Some ESP adapters need manual BOOT/RESET entry or additional CP210x/CH340 initialization. Router firmware writing is not generic and remains disabled until a model-specific adapter exists.

Install the debug APK by allowing **Install unknown apps** for your file manager, then opening the APK. No Google Play account is involved.
