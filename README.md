# DvL Bot v71 — Global cleanup

This build focuses on a cleaner package, a more practical tools flow, and fewer useless leftovers.

## Main changes

- Removed dead `gifs` code that was not used by the live command registry
- Added a direct `+tools` / `+outils` shortcut to open the tools dashboard
- Improved finder examples so they show real keyword use cases instead of category duplicates
- Kept the bot bilingual FR / EN
- Prepared the package as a lighter source zip

## Quick install

```bash
npm install
npm run check
npm run dev
```

## Useful commands

```txt
+tools
+dashboard tools
+find welcome
+find status
+find role
+help logs
+preset clean
+backup list
```

## Notes

- `+help <category>` is best to open a full section
- `+find <keyword>` is best when you only know one word and not the right menu
- This zip no longer includes `node_modules`, so run `npm install` once after extracting
