# Spanish Vocab Learner

Flashcards for Spanish vocabulary. Static TypeScript app (Vite), deployable to GitHub Pages.

## Development

```sh
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # outputs dist/
```

## Vocabulary sets

A set is a CSV with columns `spanish,english,notes` (header row optional, quote fields containing commas):

```csv
spanish,english,notes
ser,to be,"Permanent traits, identity, origin"
tener,to have,"Irregular: tengo, tienes"
```

- **Bundled sets:** add the CSV to `public/sets/` and list it in `public/sets/index.json`.
- **Uploaded sets:** use "Add CSV set(s)" in the app; they're stored in your browser's localStorage.

## Studying

Pick one or more sets, choose which side to show first (Spanish / English / mixed) and the order
(shuffled, or weakest first based on your past answers). Flip with Space or a click, then mark
**Again** (1 / ←) or **Got it** (2 / →). Missed cards come back a few cards later until you get them.

## Deploying to GitHub Pages

Push to `main` on GitHub, then in the repo's **Settings → Pages** set **Source** to **GitHub Actions**.
`.github/workflows/deploy.yml` tests, builds, and publishes `dist/` on every push to `main`.
