# SkyShield live weather dashboard

## Goal
Turn the current demo dashboard into a usable weather command screen with real data, selectable locations, and clear provider attribution. Never substitute synthetic values when a live provider fails.

## Work
1. Replace simulated metrics, seeded sensor values, fake alerts, and scenario playback with live current conditions and forecast data from publicly accessible weather services.
2. Add searchable city/location selection; choosing a location refreshes its coordinates, current weather, forecast, and map view.
3. Make refresh and navigation controls functional; show observed update time, provider/source links, loading and error states, and distinguish live measurements from forecast/model estimates.
4. Check access to MOSDAC/ISRO, NASA, and IMD sources. Integrate only endpoints that are actually public and usable without invented credentials; otherwise explain the access limitation in the source panel instead of labeling other data as theirs.
5. Verify the main flow and responsive layout, and update route metadata and project notes.

## Technical details
- Use a server function for external data requests so the browser does not need to call provider endpoints directly.
- Use location geocoding and a public live forecast feed as the immediate no-key path; keep provider access modular.
- NASA POWER is historical/derived meteorology rather than a live observation feed; show it only with correct timeframe and attribution if integrated.
- Do not fall back to demo fixtures or simulator-generated values.
