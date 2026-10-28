# ALSO Get Ready for Copilot for Microsoft 365

**Microsoft Security Fundamentals made easy.**

A simple, scroll-down guide to identity, endpoint, collaboration, and data security
before deploying Copilot for Microsoft 365. ALSO branding follows the Policy
Templates Navigator and Attack Prevention Mapper. The original overview diagram
and Business Premium-and-up foundation overview are inspired by the supplied Microsoft
Copilot architecture reference, not a reproduction of its pages.

## Publish on GitHub Pages

1. In this repository, open **Settings > Pages** and choose **GitHub Actions** as
   the build and deployment source.
2. Merge the site into `main`. The **Deploy readiness guide to GitHub Pages**
   workflow validates it and publishes only `site/`. You can also run the workflow
   manually on `main`.
3. Open the URL reported by the deployment. The expected project URL is
   <https://coc-ms.github.io/ALSO-Microsoft-Security-Fundamentals-and-Copilot-Readiness/>.

Pull requests run validation without deployment. A successful local preview does
not mean GitHub Pages has been enabled or deployed.

## Preview and validate

Requires Node.js 24 or later; there are no runtime dependencies or build step.

```powershell
node tools/preview.mjs
```

Open <http://127.0.0.1:4173>. Stop the server with Ctrl+C. To use a different port,
set `PORT` before starting it.

```powershell
node --test
```

The tests check local links/assets, unique anchors, the requested policy mapping,
reference settings, licensing caveats, and the optional navigation/print behavior.
For a visual check, review both desktop and mobile layouts, open each screenshot,
follow the chapter links, and use **Print guide**. Printing expands the screenshot
references and restores their previous state afterward.

## Content and assets

- `site/index.html`: complete guide, readable without JavaScript.
- `site/styles.css`: ALSO teal branding, responsive document layout, print styles.
- `site/site.js`: active chapter indicator and optional print button.
- `site/assets/`: ALSO logo from the public navigator and the five supplied portal
  screenshots. The Microsoft corporate logo and the source PDF are not included.
- `.github/workflows/deploy-pages.yml`: validation and Pages deployment.

## Supplied export packages

The six downloads in `site/downloads/` contain the **102 original JSON files**
supplied for this guide, with their original bytes and relative paths preserved.
Tenant IDs and other tenant-specific information are intentionally retained at
the owner's request. These are not sanitized universal templates.

| ZIP | Contents |
| --- | --- |
| `conditional-access.zip` | 21 disabled policies, 24 supporting groups, migration table |
| `app-protection.zip` | 2 app protection exports |
| `device-compliance.zip` | 27 device compliance exports |
| `defender-onboarding.zip` | 10 application/configuration/settings exports |
| `defender-security.zip` | 7 settings catalog exports |
| `browser-protection.zip` | 10 settings catalog exports |

`manifest.json` records each original file's relative path, byte length, and
SHA-256 checksum, plus archive checksums. The packaging script verifies every ZIP
entry against its source before writing the manifest. To regenerate from the
same six source folders, run:

```powershell
.\tools\package-exports.ps1 -SourceRoot '<path to FUNDAMENTALS>'
```

**Review before importing into another tenant.** Map source groups and references,
review exclusions, assignments and scope tags, and replace tenant-bound Defender
onboarding data with data generated in the target tenant. The included signed
onboarding profile is preserved, not converted into a cross-tenant profile. Keep
Conditional Access disabled until reviewed and tested; configure CA106's
authentication context separately. Follow the relevant import-tool guidance:
the ZIP itself is not a universal admin-center import format.

Purview remains linked to the requested public toolkit. Public documentation
links provide prerequisites and import guidance; they do not replace the six
supplied export downloads.

Review links, portal paths, screenshots, policy identifiers, and licensing notes
when updating the guide. E3 and Business Premium are not identical bundles.
Advanced features require their respective licenses; do not interpret a tier
heading as a blanket entitlement. Portal deep links may require authentication
and can change, so the guide also provides navigation paths.
