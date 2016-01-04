#!/bin/bash

cat ../kanjax/kanjax.js add_to_kanjax.js >kanjax.js
cp kanjax_popup_tablet.css kanjax_popup.css

scp -P 8022 kanjax_popup_template.static.html kanjax_popup.css kanjax.css kanjax.js 192.168.0.132:/storage/sdcard0/AnkiDroid/collection.media/kanjax

rm kanjax.js kanjax_popup.css