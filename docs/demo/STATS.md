# Homepage counters

Starting totals are **1,135 page visits**, **178 download-button clicks** and **268 likes**. These supplied baselines are not reconstructed historical measurements.

Each production page load increments the shared visit counter. Every click on either the main Windows download button or the upper-right download button increments one shared download-click counter immediately on screen. Repeated clicks count, even if the file transfer is cancelled or fails. This measures button clicks, not completed file downloads. Links retain their normal download behavior; counting requests use keepalive and never delay the download.

Each like increments a separate shared counter, with repeat likes allowed. Click requests are queued to preserve rapid clicks. Failed counter requests revert the pending increment and retain the last saved number. Local previews simulate clicks without modifying production counts. Decorative heart effects respect reduced-motion preferences.

All three values use CountAPI. Counter keys are public identifiers, not credentials. Orbit collects no visitor identity in this code. A browser cache is a fallback, not the shared source of truth. The community-hosted service has no uptime guarantee. Counter seeds must not be reset during deployment.

The older GitHub release-asset ledger in `site-stats.json` remains separate for historical file-transfer metrics. Its scheduled workflow does not update or overwrite the homepage download-click count.

Reference: [CountAPI](https://github.com/syntaxerror019/countapi).
