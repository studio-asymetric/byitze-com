# byitze.com

Personal one-pager for **Dalibor Itze** — portrait, contact links, and featured projects from [Studio Asymetric](https://asymetric.studio/). Project cards load from the studio CMS and open on asymetric.studio.

**Live:** https://byitze.com

Static site: HTML, CSS, vanilla JS. No build step.

## Preview locally

From this folder:

```bash
python -m http.server 4173
```

Open http://127.0.0.1:4173

## Deploy on Coolify (GitHub App)

Coolify builds the Dockerfile; nginx serves the site on port **80**. No database, no env vars, no volumes.

1. In Coolify (`ops.asymetric.studio`), add an application from the GitHub App: **`studio-asymetric/byitze-com`**, branch **`main`**.
2. Build pack: **Dockerfile**. Port: **80**.
3. Domains: **`byitze.com`**, **`www.byitze.com`**. Enable HTTPS (Let’s Encrypt).
4. Turn on **Auto Deploy** on push to `main`.

### DNS

Point the apex and `www` at the Hetzner VPS (same node as other Studio Asymetric sites, `157.90.175.53`). At Wedos, use explicit records so traffic does not follow the legacy wildcard to the old host.

| Type | Host | Target |
| --- | --- | --- |
| A | `@` | `157.90.175.53` |
| A | `www` | `157.90.175.53` |

### CMS CORS

Featured projects are fetched in the browser from `https://cms.asymetric.studio`. That CMS already allows `https://byitze.com` and `https://www.byitze.com` as origins.

## License

Website code is [MIT](LICENSE). Display type is Delight Black by Rajesh Rajput. Interface type is Geist (OFL).
