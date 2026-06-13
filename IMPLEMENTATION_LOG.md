# Implementation Log

This document captures the main bugs, mismatches, and feature gaps that were found during the recent cleanup pass, along with the changes made and why they were made.

## Summary

The repo started with a working editor shell, but several documented features were either partially implemented or mismatched with the actual runtime behavior. The biggest issues were around theme handling, README accuracy, search behavior, autocomplete gating, provider defaults, and the lack of a real Python runner surface.

## Bugs Found and Fixes Applied

### 1. README overclaimed the current feature set

Problem:
The README listed several features as fully implemented even when the runtime behavior was incomplete or only partially wired.

Change:
Rewrote the README to describe the current state more accurately and to separate implemented features from optional or partial support.

Why:
The documentation needs to match what users can actually do in the app.

### 2. Theme setting existed but did not affect the UI shell

Problem:
The settings UI exposed a theme selector, but the app itself stayed on a single dark palette.

Change:
Added a shared theme helper, applied theme classes at the document level, switched Monaco and terminal themes, added day/night toggling, and introduced a hacker-inspired theme.

Why:
The UX needed to feel intentional and less cursor-like, with visible modes that users can actually switch between.

### 3. Search mode toggle was cosmetic only

Problem:
The search sidebar showed text vs semantic modes, but both used the same semantic search endpoint.

Change:
Added a backend text-search path and wired the frontend search panel to send the selected mode.

Why:
The UI advertised a feature that did not change behavior.

### 4. Inline autocomplete was overly throttled

Problem:
Autocomplete only triggered on a narrow character-count condition, which made it feel broken.

Change:
Removed the modulo-based gate so autocomplete is allowed whenever the cursor context is eligible.

Why:
Autocomplete should respond naturally, not only at arbitrary text-length boundaries.

### 5. File upload existed only on the backend

Problem:
There was a backend upload endpoint, but no frontend affordance to use it.

Change:
Added upload support to the file tree UI and an API helper to call it.

Why:
Backend features are not useful unless the UI can reach them.

### 6. Theme defaults were inconsistent

Problem:
Theme values were stored in a few places, but there was no consistent app-wide default or normalization.

Change:
Normalized themes in settings, made Continue.dev the default chat provider, and added explicit day/night/hacker theme handling.

Why:
Defaults should be deterministic so the app starts in a known state.

### 7. Continue.dev and PyRunner were not integrated

Problem:
There was no Continue.dev provider and no Python execution path.

Change:
Added a Continue.dev provider entry, default chat provider settings, a Python runner backend route, and a command-palette action to run the current Python file through PyRunner.

Why:
The requested workflow needed a default chat backend and a practical Python execution path.

## Files Changed Most Often

- [README.md](README.md)
- [frontend/src/App.jsx](frontend/src/App.jsx)
- [frontend/src/App.css](frontend/src/App.css)
- [frontend/src/services/api.js](frontend/src/services/api.js)
- [frontend/src/components/settings/SettingsModal.jsx](frontend/src/components/settings/SettingsModal.jsx)
- [frontend/src/components/editor/CommandPalette.jsx](frontend/src/components/editor/CommandPalette.jsx)
- [backend/src/services/aiService.js](backend/src/services/aiService.js)
- [backend/src/services/aiProviders.js](backend/src/services/aiProviders.js)
- [backend/src/services/settingsService.js](backend/src/services/settingsService.js)

## Why These Changes Were Made

The goal was to make the app honest in its docs, more coherent in its UI, and more useful in practice. The code now reflects the actual state of the product more closely, with a clearer theme system, a real default chat provider, and a Python execution option that matches the broader IDE workflow.