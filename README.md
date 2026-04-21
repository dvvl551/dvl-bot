# Neyora Bot v75.0 — Global safe polish pass

This build is the full safe-update polish pass.

## What changed

- Help is cleaner, better ordered and more useful for both members and staff
- Staff-side flow is clearer for recruitment, onboarding and daily moderation
- Smart panel and dashboard are more coherent for setup, checks and team usage
- Support, confessions and public text hubs are cleaner and easier to manage
- TikTok alerts and watcher views are clearer and more useful
- Update safety is kept: the zip is meant to avoid wiping your saved guild config

## Quick install

```bash
npm install
npm run check
npm run dev
```

## Useful commands

```txt
+help
+help members
+help staff
+dashboard
+panel
+logs panel
+support panel
+confessions panel
+tiktok list
+ready
```

## Staff setup tips

```txt
+help staff
+permrole 1 @Helper
+permcmd 1 add support
+permcmd 1 add warnings
+guide moderation
```

## Update safety

- Keep your own `data/` folder when updating
- Do not overwrite your saved guild config if your server is already configured
- If welcome / leave / boost stop working after an update, check the saved config first

## Notes

- This zip is source-first, so run `npm install` after extracting
- `+help +commande` opens a command card directly
- `+find <mot-clé>` stays the fastest way to locate a feature

- Staff blacklist flow added: `+bl`, `+unbl`, `+bllist` with safer moderation handling

Extra moderation shortcuts:

```
+mute @member 10m spam
+unmute @member
+bl @member alt détecté
+bllist
```
