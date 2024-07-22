# Scriptable - Prusa Connect local Widget
Widget to show 3D printer details supported by Prusa Connect local API

## Requires
[Scriptable for iOS](https://apps.apple.com/us/app/scriptable/id1405459188)

## Setup
* Copy widget to scriptable
* Add scriptable widget (medium size)
* Widget config:
    * Script: choose script
    * When interacting: Run Script
    * Parameter: ip address to prusa printer, username, password   ( everything is delimited by comma example: 192.168.0.1, that_guy, my_awesome_password )

## Screenshots

### Printing
![Printing](assets/printing.jpg "Printing")
![Printing - Darkmode](assets/printing_darkmode.jpg "Printing - Darkmode")

### Offline / Not Available
![Offline](assets/offline.jpg "Offline")
![Offline - Darkmode](assets/offline_darkmode.jpg "Offline - Darkmode")

### Idle
![Idle](assets/idle.jpg "Idle")
![Idle - Darkmode](assets/idle_darkmode.jpg "Idle - Darkmode")



## getting into the code
* You need to have npm. To install dependencies call `npm install` in root folder.
* Main entry point is in ```main.ts```
* To build you js bundle use defined ```package.json``` action or call `rollup --config rollup.config.ts --environment file_path:./src/main.ts --configPlugin @rollup/plugin-typescript` in root folder.
