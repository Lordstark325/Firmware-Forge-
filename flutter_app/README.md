# Firmware Forge Mobile - Flutter

Responsive Android phone and tablet companion for Firmware Forge Desktop.

## Adaptive layout

- Phones use bottom navigation and single-column cards.
- Medium screens use two-column cards.
- Tablets use a persistent navigation rail, constrained content width, and up to three columns.
- All pages respect Android safe areas and system navigation.

## Native integration

The Dart interface uses a platform channel named `firmware_forge/device`. The Android host preserves USB device discovery and the authenticated local gateway on ports 8765 and 8766.

The current internal release uses application ID `za.co.firmwareforge.mobile`, version `0.5.0+5`, Android 8.0 minimum, and the same signing certificate as earlier internal APKs so it can be installed as an update.
