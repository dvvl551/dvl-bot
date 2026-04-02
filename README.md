## v42 highlights

- deeper module hubs with status, quick setup, advanced options and checks
- clearer texts hub for welcome / leave / boost with embed/plain guidance
- richer logs overview with routing, event toggles and one-shot setup flow
- better support / tracking / voice / security / automation / giveaway / TikTok hub guidance
- roles hub expanded with status-role and panel shortcuts

# DvL Bot v42 — One-shot Clean Overhaul

This pass makes the welcome / leave / boost text system actually advanced in use, not just nicer in help text. It also keeps boost on the logs side instead of mixing it fully into welcome / leave.

## What changed

- **Advanced text controls now really work at runtime**
  - `embed` or `plain` mode
  - custom title
  - custom footer
  - custom color
  - custom image
  - reset / example / test commands

- **Welcome and leave are grouped together cleanly**
  - `+texts welcome`
  - `+texts leave`
  - `+texts vars`

- **Boost stays on the logs/tracking side**
  - `+boost` is still available for editing the boost announcement text
  - but boost is no longer presented like a normal welcome/leave event
  - help/setup wording was cleaned up to reflect that

- **Real runtime support added**
  - join messages now respect `mode`, `footer`, `color`, `image`
  - leave messages now respect `mode`, `footer`, `color`, `image`
  - leave DMs now respect `dmmode`, `dmfooter`, `dmcolor`, `dmimage`
  - boost messages now respect `mode`, `footer`, `color`, `image`

## Start

```bash
npm install
cp .env.example .env
npm run deploy
npm start
```

## Quick commands

```txt
+texts
+texts welcome
+texts leave
+texts boost
+texts vars

+welcome mode embed
+welcome footer Profite bien du serveur
+leave dmmode plain
+boost color #FF73FA

+welcome test
+leave test
+leave testdm
+boost test
```
