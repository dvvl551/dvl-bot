# DvL Bot v49 — Final Stable Bundle

This build is aimed at actually running the bot on a live server without having to keep updating every few messages.

## What changed

- **Help by real use case**
  - `+help start`
  - `+help staff`
  - `+help members`
  - `+help repair`
  - these shortcuts are also exposed in the help buttons

- **Cleaner staff lists**
  - `+whitelistlist` now uses the same richer view as `+wl list`
  - `+autorolelist` resolves real roles and shows broken IDs separately
  - `+backup list` is chunked into readable pages
  - `+glist` is chunked and easier to scan
  - `+tiktoklist` is chunked and easier to scan

- **Stats stay automatic**
  - live stats still refresh automatically
  - missing counters still auto-repair when possible
  - manual `+stats refresh` remains available, but it is no longer the normal path

- **Stable routing kept**
  - command collisions already fixed in v48 remain fixed
  - `+stats` stays on the real stats hub
  - `+welcome` stays on the real welcome hub

## Quick deploy

```bash
npm install
npm run check
npm start
```

## Practical commands

```txt
+setup
+help start
+help staff
+panel
+logs setup
+support panel
+welcome
+leave
+stats
+wl list
+autorolelist
+backup list
+glist
+tiktoklist
+repair all
```
