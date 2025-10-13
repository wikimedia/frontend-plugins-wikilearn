# Wikilearn Frontend Plugins

## Overview

This package is a React component library of Wikilearn-specific plugin components
for Open edX Micro-Frontends (MFEs). It is designed to be consumed by the
`@openedx/frontend-plugin-framework` and made available in MFE plugin slots.

Instead of maintaining custom patches inside the Wikilearn Tutor plugin, we ship
these components as a reusable NPM package. The Tutor plugin installs and wires
the library into the relevant MFEs so the components are available at runtime.

## Usage

This package is not installed directly in MFEs. Instead, it's integrated via the
Wikilearn Tutor plugin (`tutor-contrib-wikilearn`) which handles installation,
configuration, and MFE integration.

The following example shows how to integrate the frontend plugins in a tutor plugin:

```python
hooks.Filters.ENV_PATCHES.add_items(
    [
         (
             f"mfe-dockerfile-post-npm-install-discussions",
             """
 RUN npm install git+https://${GITHUB_TOKEN}:x-oauth-basic@github.com/edly-io/frontend-plugins-wikilearn.git
 
 
 """,
         ),
        (
            f"mfe-env-config-runtime-definitions-discussions",
            """
    const { UsernameMention } = require('frontend-plugins-wikilearn');
""",
        ),
    ]
)


 PLUGIN_SLOTS.add_items([
    (
         "discussions",
         "org.openedx.frontend.discussions.user_mention_plugin.v1",
         """
         {
           op: PLUGIN_OPERATIONS.Insert,
           widget: {
             id: 'user_mention_plugin',
             type: DIRECT_PLUGIN,
             priority: 10,
             RenderWidget: UsernameMention,
           },
         }"""
     )
 ])
```

## Local development

### Prerequisites

- Node.js version specified in `.nvmrc`

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run tests:

   ```bash
   npm test
   ```

3. Build the library (outputs to `dist/`):

   ```bash
   make build
   ```

## Plugin organization

Plugin components should be organized by MFE in the source code structure.

## License

AGPL-3.0