# Homepage counters

The supplied starting totals are **1,135 page visits**, **178 software downloads** and **268 likes**. They are baseline values, not numbers reconstructed from GitHub.

The page adds one shared CountAPI hit per production page load. Local development reads the value without incrementing it. The public counter key is not a credential. The service is a community-hosted counter with no uptime guarantee; the page keeps the last available number when it cannot reach the service. No visitor identity is collected by Orbit's counter code.

Each production like increments a second shared counter. Repeat likes are allowed. Requests are queued to preserve rapid clicks; a failed request is not silently counted as saved. The heart and star animation respects reduced-motion preferences. Local previews animate and simulate likes without changing the public total.

Software downloads use GitHub's `download_count` for `Orbit.exe` and the complete Windows/source ZIP files. Videos, checksums, bridges and runtime templates are excluded. The initial asset snapshot prevents adding earlier downloads twice. The per-asset ledger preserves credited totals if old releases are removed or an asset is replaced.

The `site-stats.yml` workflow checks published releases approximately every 30 minutes and after a release is published. It writes only `site-stats.json` on `gh-pages` using the workflow token. No token is sent to visitors. The page reads this small file from GitHub's raw-content endpoint, so statistics updates do not depend on rebuilding GitHub Pages. A browser cache is only a fallback, not the shared source of truth.

To verify manually, run the **Sync site download statistics** workflow. To change baseline values, update the persisted state deliberately rather than reseeding the counter on every deployment.

References: [GitHub release asset counts](https://docs.github.com/en/rest/releases/releases), [CountAPI](https://github.com/syntaxerror019/countapi).
