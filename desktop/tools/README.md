# Bundled ESP tooling

Release builds include `esptool.exe` version 5.3.1 so ESP32 inspection, backup, and flashing work without a separate Python installation.

esptool is licensed under GPL-2.0-or-later. Its source is available at https://github.com/espressif/esptool and the included license is in `LICENSE-esptool.txt`.

The executable is generated from the official PyPI package with a minimal PyInstaller launcher that invokes `esptool._main()`.
