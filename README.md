# ALSO Get Ready for Copilot for Microsoft 365

**Microsoft Security Fundamentals made easy.**


   <https://coc-ms.github.io/ALSO-Microsoft-Security-Fundamentals-and-Copilot-Readiness/>.

## Local language review

English uses the site base URL. German, French, Spanish, Russian, Italian, and Polish
use `de/`, `fr/`, `es/`, `ru/`, `it/`, and `pl/`. These are working site routes, not
separate review exports. The
upper-right globe and native language dropdown keep the current chapter and
query parameters, including when navigating back or forward.

The English source is `site/index.html`; translated text is maintained in
`translations/{de,fr,es,ru,it,pl}.json`. After changing the source or a catalog, run
`node tools/localize.mjs` to regenerate the localized pages. Use
`node tools/localize.mjs --extract` to refresh the English key inventory after
source text changes. Missing, stale, and empty translations fail the build.

Run `node --test` to check content parity, generated pages, assets, and existing
guide behavior. Start an interactive, local-only preview in PowerShell:

```powershell
$env:PORT = "5183"
node tools\preview.mjs
```

Open `http://127.0.0.1:5183/`, `/de/`, `/fr/`, `/es/`, `/ru/`, `/it/`, or `/pl/`. The preview binds only
to loopback and does not publish anything. Reference screenshots, policy source
downloads, and external services retain their original language/settings;
their descriptions and instructions are translated. All language versions link
to the original English break-glass PDF, clearly labeled as English.

All 23 unique Microsoft Learn links use verified localized destinations for
German, French, Spanish, Russian, and Italian. Polish has 19 localized articles
and four explicitly labeled English fallbacks: sensitivity labels, data access
governance reports, restricted content discovery, and external sharing settings.
Those four `/pl-pl/` responses have English article bodies and `html lang=en-us`;
a Polish-looking URL alone is not treated as localization.
`tools/learn-links.json` records final redirect URLs, HTTP status,
document language, and explicit fallback reasons if an article is unavailable.
Refresh the audit with `node tools/verify-learn-links.mjs`, then regenerate the
site. Non-Learn external links are unchanged; GitHub links do not add unsupported
login locale parameters.

Companion-site links to Policy Templates Navigator and Attack Prevention Mapper
use the matching production `de/`, `fr/`, `es/`, `ru/`, `it/`, or `pl/` route on translated pages.
English retains the existing production base URLs.

Microsoft setting, navigation, and feature terminology was reviewed against
localized Learn article headings, body text, and UI steps in all six translated languages.
`tools/terminology-audit.json` records the English inventory, reviewed
translations, evidence URLs/excerpts, retained brands and identifiers, and
uncertainties. Russian uses `Условный доступ` and `Скрипты`, with grammatical
inflections in prose; Italian uses `Accesso condizionale` and German uses
`Bedingter Zugriff`. Polish uses `Dostęp warunkowy`, `Zgodność`, `Skrypty`,
and `Domyślne ustawienia zabezpieczeń`. The Polish security-defaults article
itself uses inconsistent variants; the audit records that limitation rather than
claiming a verified tenant label.

This is documentation-based verification, not a certification of current tenant
UI labels. Learn itself sometimes mixes English and translated labels. The
supplied preview agent-blueprint and global-administrator toggle labels still
need confirmation in a localized tenant. The keep-signed-in control now has
localized documentation evidence for all six languages, but has not been
compared with a live tenant. English-only SharePoint/Purview sources do not
certify Polish admin-control labels.
Original English screenshots and PDF documents remain unchanged.

## Original emergency-access PDF

`site/downloads/break-glass-account-best-practices.pdf` remains the byte-identical
English original, preserving its layout and screenshots. Translated PDF copies
and their generation artifacts have been removed. The download label states
English in each site's selected language. Tests check the original checksum,
all seven language links, and the absence of translated PDF files.
