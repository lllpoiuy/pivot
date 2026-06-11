# PIVOT — project page

Static project page for PIVOT, served via GitHub Pages at
`https://lllpoiuy.github.io/pivot/` (custom domain: `https://linshey.com/pivot/`).

Videos are hosted on a CDN (`https://cdn-pivot.linshey.com/`), so no large media files live in
this repository.

## Structure

```
index.html              # the page (videos load from the CDN)
css/style.css           # local stylesheet, system fonts only
js/charts.js            # self-contained inline result charts
js/video.js             # lightweight custom video controls
assets/
  images/               # drop figure images here if needed
.nojekyll               # serve files as-is on GitHub Pages
```

## Local preview

```
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (GitHub Pages)

Push to `main`; Pages serves the repository root as-is (`.nojekyll`).
