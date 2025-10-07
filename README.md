# SkyRun Brian Head — Income Estimator (v7f13)

New: **Address → Map fallback** for the photo panel.  
If no photo is uploaded, the app geocodes the address using OpenStreetMap Nominatim and displays a **static map image** from `staticmap.openstreetmap.de`. Uploading a photo overrides the map.

## Notes
- Light usage only; OSM services are rate-limited. For higher volume, consider a key-based map service (Google Static Maps, Mapbox Static Images) with domain restrictions or a tiny proxy.
- Everything else remains unchanged: PDF → email flow (with `afterprint`), pets uplift, sensitivity, charts, CSV, footer, single on-page logo (no print duplicate).

## Publish
Upload `index.html` to your GitHub Pages repo root (or deploy the whole folder).