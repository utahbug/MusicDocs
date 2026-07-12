# MusicDocs

A simple private/local music helper for Primary music planning, quick lists, cards, links, and uploaded files.

This repository is intended to hold the app shell: HTML, CSS, JavaScript, icons, and starter data. Personal music files and exported data backups should be treated as private.

## Local/private data

The app stores user-added items, favorites, lists, uploaded PDFs/images, and cards in the browser on each device.

Use the app menu:

- `Export data + files`
- `Import data + files`

to intentionally move a private setup between devices or app versions.

## Public-safe sharing

Before making this repository public, avoid committing:

- copyrighted or personal PDFs
- exported app data/files backups
- private church-only files

The starter `library.json` is intentionally clean so each user can build or import their own local library.

## Running locally

From this folder:

```bash
node server.mjs
```

Then open the shown local or Wi-Fi URL.
