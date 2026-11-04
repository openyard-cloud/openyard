# Contributing to OpenYard

## Add a project by pull request

1. Fork this repository and create a branch, for example `project/my-app`.
2. Add your logo to `projects/logos/` and a screenshot to `projects/images/` (square SVG, PNG or WebP, at most 150 KB). Name it after your slug, for example `my-app.svg`.
3. Add `projects/my-app.json`:

```json
{
  "slug": "my-app",
  "name": "My App",
  "type": "open-source",
  "kinds": ["dev"],
  "status": "live",
  "tagline": { "en": "One line, at most 80 characters", "vi": "Tùy chọn: một dòng tiếng Việt" },
  "description": { "en": "Who it is for and what it does, at most 300 characters." },
  "url": "https://my-app.example.com",
  "repo": "https://github.com/you/my-app",
  "license": "MIT",
  "logo": "my-app.svg",
  "image": "my-app.webp",
  "color": "#3b5bdb",
  "maintainers": ["your-github-username"],
  "tags": ["education", "ai"],
  "added": "2026-11-04"
}
```

4. Run `npm run check` (Node 20+). Fix anything it reports.
5. Open a pull request. A maintainer reviews it; it appears on openyard.cloud after merge.

### Fields

| Field | Required | Notes |
|---|---|---|
| `slug` | yes | Same as the file name. Lowercase letters, numbers, dashes. |
| `name` | yes | At most 40 characters. |
| `type` | yes | `app` (free to use) or `open-source` (public code + license). |
| `kinds` | yes | One or more of `people` (an app for people software forgets), `wild` (a strange or experimental idea), `dev` (a tool for developers). |
| `status` | yes | `live`, `beta` or `soon`. |
| `tagline.en` | yes | At most 80 characters. Add `vi` or other languages if you like. |
| `description.en` | yes | At most 300 characters. |
| `url` | yes | `https://` link people should open. |
| `repo`, `license` | open source | Required for `open-source` unless `status` is `soon`. |
| `logo` | yes | File name inside `projects/logos/`. |
| `image` | recommended | A screenshot of your project in `projects/images/` (WebP, PNG or JPG, at most 400 KB, about 1200×600). It is the big picture on your card. |
| `logoStyle` | no | `tile` if your logo is a full app icon, `mark` (default) if it needs a white tile behind it. |
| `color` | no | Hex color used for your card's glow. |
| `maintainers` | yes | GitHub usernames. |
| `tags` | no | Up to 5 lowercase tags. |

`team`, `featured` and `swarm` are set by maintainers.

## Work on the site

The site is `public/index.html` (plain HTML, CSS and JavaScript, no build step besides `scripts/build.mjs`). Run `npm run dev`, check light and dark mode, English and Vietnamese, and a narrow window before opening a pull request.

## Be kind

Be respectful, assume good intent, and help newcomers. Maintainers may remove listings or comments that break this.
