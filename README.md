# DvL Bot v50 — Polished Final

This build is the big final clean pass meant to be **deployed and used**, not patched every hour.

## What was polished

- **Moderation upgraded**
  - warn, warnings, clearwarnings, timeout, kick, ban, unban, nick
  - cleaner staff embeds
  - DM to the target when possible
  - richer moderation logs with avatar, moderator, reason, duration and DM status

- **Logs more consistent**
  - richer channel / role / invite update logs
  - nickname change logs now include avatar + before / after
  - moderation logs are much more detailed

- **Stats / voice quality pass**
  - stats channel binding now keeps the linked category when possible
  - stats still auto-refresh and auto-repair missing counters

- **New moderation hub**
  - `+moderation`
  - `+moderation warn`
  - `+moderation timeout`
  - `+moderation ban`
  - `+moderation kick`

- **Cleaner global embeds**
  - base embeds now safely support array descriptions
  - better clipping and more consistent footer behavior

## Quick deploy

```bash
npm install
npm run check
npm start
```

## Practical commands

```txt
+setup
+panel
+logs setup
+moderation
+warn @member reason
+warnings @member
+timeout @member 10m spam
+ban @member reason
+support panel
+stats
+voice
+wl list
```
