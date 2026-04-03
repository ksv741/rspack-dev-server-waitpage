# rspack-dev-server-waitpage

Shows a build progress page in the browser while rspack is compiling. Instead of a blank screen or an error, users see a progress bar with the current build status.

> **Rspack equivalent of [webpack-dev-server-waitpage](https://www.npmjs.com/package/webpack-dev-server-waitpage).**
> The original package does not support rspack — this one does.

## Installation

```bash
npm install --save-dev rspack-dev-server-waitpage
```

**Peer dependencies:** `@rspack/core >=0.7.0`, `@rspack/dev-server >=0.7.0`

## Usage

```js
// rspack.config.js
const { RspackWaitPagePlugin } = require('rspack-dev-server-waitpage');

module.exports = {
  // ...
  plugins: [
    new RspackWaitPagePlugin(),
  ],
};
```

No additional configuration needed — the plugin automatically injects middleware into `devServer.setupMiddlewares`.

## Options

```js
new RspackWaitPagePlugin({
  title: 'Building…',             // Browser tab title
  disableAfterFirstBuild: true,   // Stop intercepting after the first successful build
  delay: 0,                       // Artificial hold (ms) after build finishes
  pollInterval: 100,              // Browser polling interval (ms)
})
```

| Option | Default | Description |
|---|---|---|
| `title` | `"Building…"` | Browser tab title shown on the wait page |
| `disableAfterFirstBuild` | `true` | After the first successful build the wait page is no longer shown (only blocks the very first load) |
| `delay` | `0` | Artificial delay in ms after the build finishes before the page disappears — useful for debugging the wait page UI |
| `pollInterval` | `100` | How often the browser polls `/rspack-wait-page/progress`. Lower = smoother progress bar, slightly more requests |

## How it works

The plugin intercepts all `text/html` requests while a build is in progress (`isBuilding = true`) and serves a progress bar page instead. The browser periodically polls `GET /rspack-wait-page/progress`, which returns JSON with the current build state. Once the build completes, the page automatically reloads and opens the real application.

Non-HTML requests (JS, CSS, etc.) are passed through untouched.
