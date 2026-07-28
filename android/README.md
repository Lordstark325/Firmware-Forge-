# Firmware Forge Mobile

Private, sideload-only Android companion. It requires a phone with USB Host/OTG support and a data-capable cable or OTG adapter.

Version 0.1 detects USB devices, classifies common ESP serial bridges and modem/router USB interfaces, requests Android USB permission, selects firmware through the Storage Access Framework, and calculates SHA-256 locally. Firmware writes are deliberately disabled until the Android ESP transport is validated against real hardware.

Install the debug APK by allowing **Install unknown apps** for your file manager, then opening the APK. No Google Play account is involved.
