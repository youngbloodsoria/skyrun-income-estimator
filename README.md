# SkyRun Brian Head — Income Estimator (v7f12)

Update: **Print → Email modal** now uses the `afterprint` event for reliability on GitHub Pages and desktop/mobile browsers, with a fallback timer.

## Contents
- `index.html` — main app (same as `SkyRun_Income_Estimator_v7f12.html`).
- `SkyRun_Income_Estimator_v7f12.html` — versioned copy.
- `SkyRun_Vertical_Full_Color_brian_head.png` — logo for reference.

## Deploy (GitHub Pages)
Upload the files inside this folder to your repo root and enable Pages (main branch, root).

## Notes
- Click **Download PDF** → the browser opens the **Print** dialog. After you save, the **email modal** appears automatically.
- Some mobile browsers don’t fire `afterprint`; a small fallback timer ensures the modal still appears.