# DvL Bot v23 Polish

Clean rebuild focused on usability without removing the existing command set.

## New in v23

- **Ghost ping is now more reliable**
  - message snapshots are cached on send/edit
  - deleted or edited pings are detected more often, even when Discord cache is partial

- **Help is cleaner**
  - `+help` no longer dumps every category row at once
  - new **Categories** button opens a proper category browser
  - pages stay compact and easier to use

- **Server trophy / progress board**
  - `+trophy` shows server progression
  - `+trophychannel here` posts a persistent board
  - `+trophyrefresh` refreshes it
  - `+trophyconfig` shows the current setup

- **Still includes v22 upgrades**
  - live stats channels with `+statssetup`
  - voice moderation roles with `+setvoicemuterole` / `+setvoicebanrole`
  - temp voice / voice tracking improvements

## Start

```bash
npm install
cp .env.example .env
npm run deploy
npm start
```

## Minimum `.env`

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
OWNER_IDS=
DEFAULT_PREFIX=+
```

## Quick examples

```txt
+help
+help categories
+help moderation 2

+statssetup
+trophychannel here
+trophyrefresh

+setvoicemuterole @MutedVC
+setvoicebanrole @BannedVC
+ghostping on
+ghostping #logs
```
