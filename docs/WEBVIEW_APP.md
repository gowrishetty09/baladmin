# BAL Admin WebView app

The mobile entry point now loads the existing live web admin. It does not maintain a second set of admin features. Existing native screens remain in the repository but are not mounted by `App.tsx`.

## Configuration and builds

- Default URL: `https://bestaerolimo.com/admin/`.
- Override with `EXPO_PUBLIC_ADMIN_URL` before building, using an HTTPS URL with no query string or fragment. Use a trusted staging admin deployment for staging builds.
- Android package stays `com.bal.admin`; iOS bundle identifier stays `com.bal.adminapp`.
- Install using `npm ci`. Both existing lockfiles include the new modules; use one package manager per checkout.
- Native dependencies: Expo SDK 54 compatible WebView, file-system, sharing, and print. Build a new binary; an update to the old JavaScript bundle alone is insufficient.
- Android: `npx expo prebuild --platform android --no-install`, then `npm run android` for development. Use `npm run build:android` for an EAS production build with the existing signing credentials.
- iOS: `npm run build:ios` with configured Apple signing/APNs credentials, or use a Mac and `npm run ios`.
- Deploy the matching `cab-management/apps/web-admin` build before distributing the app. Web changes remain compatible with normal browsers. Native integrations require this web deployment; merely installing the new binary does not deploy it.

## Behavior

- Existing web login, role restrictions, API calls, routing, sockets, and all admin pages are reused.
- In the native shell the web auth adapter stores the session using Expo SecureStore, not localStorage. Browser sessions retain their existing storage. Users sign in once after replacing the old native app.
- Only the configured admin origin/path can stay inside the WebView or use its bridge. Other supported links open through the OS. HTTP subresources and local file access are disabled.
- Native push registration uses the existing `/notifications/register-device` API with `appType: ADMIN`. Browser push is not started inside the app. Notification taps wait for authenticated web readiness and use existing protected routes. Logout unregisters the device before revoking the session; a network failure is reported and local logout still completes.
- HTML file inputs use the platform picker. CSV/templates/QR exports and private fleet PDFs use the share/save sheet. Exports are limited to 50 MB per bridge transfer; uploads continue through the existing web API and its limits. Shared files stay in the app's private cache while the receiving app reads them. Exports older than 24 hours are removed at the next app start.
- Invoice printing uses the platform print dialog, including available PDF-save options. Offline editing is not supported. Startup failures show a retry screen.
- Android back follows WebView navigation history. Orientation can change to make dense admin tables easier to use.

## Checks

```text
npx tsc --noEmit
node scripts/test-webview.cjs
npx expo export --platform android --platform ios --output-dir dist
```

In `cab-management`, run `node apps/web-admin/scripts/test-mobile-bridge.cjs` and build with `pnpm --filter web-admin build`.

The browser smoke test is `apps/web-admin/scripts/smoke-mobile.cjs`. It requires Playwright, a local Vite server at port 4311 (override `ADMIN_TEST_URL`), and optionally `PLAYWRIGHT_MODULE` pointing at an installed Playwright package. All API responses are mocked and external requests are blocked; this does not validate production data or native device behavior.

Before release, validate on physical Android and iOS devices: notification permission denied/granted, foreground/background/cold launch taps, login restoration/expiry/logout/account switching, camera/file uploads, private PDF sharing, invoice printing, long tables and forms, maps/socket reconnects, and offline retry. Repeat with Super Admin and restricted admin roles. Check every web route/action using the web admin as the parity checklist. Store signing and publication remain separate from local builds.
