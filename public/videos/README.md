# public/videos

This directory is intentionally empty in the repository.

## Required video assets

To enable the hero background video on the landing page, add the following files here:

| File | Description |
|------|-------------|
| `hero-travel.mp4` | Desktop hero video (landscape, ≥ 1920 × 1080, H.264, ≤ 15 MB recommended) |
| `hero-travel-mobile.mp4` | Mobile hero video (portrait or cropped landscape, ≤ 8 MB recommended) |

## Notes

- The `HeroVideo` component defaults to **empty strings** when no `src` prop is passed.
  The `<video>` element is **not rendered** unless a non-empty `src` is provided, so
  no 404 requests are made when the files are absent.
- When the files are present, place them in this directory and they will be served at
  `/videos/hero-travel.mp4` and `/videos/hero-travel-mobile.mp4` automatically.
- Keep MP4 files out of git (add to `.gitignore` if needed) and distribute them via
  your CDN or object storage instead.
