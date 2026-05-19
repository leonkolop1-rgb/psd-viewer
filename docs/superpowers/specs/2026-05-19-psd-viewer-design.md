# PSD Viewer — Design Spec
Date: 2026-05-19

## Overview
A standalone browser-based tool for opening and viewing PSD files. Built with Vite + Vanilla JS. No backend required — everything runs in the browser.

## Core Features
- Drag & drop or file picker to load a `.psd` file
- Static canvas preview of the full composite
- Layer tree sidebar with visibility toggle (checkbox per layer)
- Group layers: collapsible with ▶/▼, visibility toggle hides all children
- Re-composite canvas on every visibility change
- כפתור "הורד PNG" — שומר את ה-canvas הנוכחי (שכבות גלויות בלבד) כ-PNG

## Tech Stack
- **Vite** — dev server + build
- **ag-psd** — PSD parsing and per-layer pixel data in the browser
- **Vanilla JS** — no framework

## File Structure
```
psd-viewer/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.js             ← entry point, drag & drop events
    ├── psd-parser.js       ← ag-psd parse logic
    ├── layer-tree.js       ← sidebar layer tree + toggle logic
    └── canvas-renderer.js  ← compositing visible layers to canvas
```

## Layout

**מסך ראשוני (לפני טעינת קובץ):**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│      ┌─────────────────────┐        │
│      │  גרור קובץ PSD      │        │
│      │  או לחץ לבחירה      │        │
│      └─────────────────────┘        │
│                                     │
└─────────────────────────────────────┘
```

**אחרי טעינת קובץ:**
```
┌────────────────┬────────────────────┐
│ Layer Tree     │                    │
│                │    Canvas          │
│ ☑ Layer 1      │    (PSD preview)   │
│ ☑ Layer 2      │                    │
│ ▶ ☑ Group 1    │                    │
│   ☑ Sub Layer  │                    │
│ ☐ Layer 3      │                    │
│                │                    │
│ [הורד PNG]     │                    │
└────────────────┴────────────────────┘
```
אזור ה-upload הוא אלמנט יחיד — לחיצה פותחת file picker, גרירה מעלה קובץ. כפתור "הורד PNG" מופיע בתחתית ה-sidebar לאחר טעינה, ושומר את ה-canvas הנוכחי.

## Rendering Logic
1. `ag-psd` parses the PSD once on load — produces layer tree + `ImageData` per layer
2. On load and on each visibility toggle, `canvas-renderer` composites all visible layers bottom-to-top
3. Group visibility: a hidden group hides all its children regardless of their own state
4. Respects layer blend mode and opacity

## Color Design
| Element | Value |
|---|---|
| App background | `#000000` |
| Sidebar background | `#111111` |
| Buttons (text + actions) | `#dcff2a` with black text |
| Layer text | `#ffffff` |
| Layer hover | `#1a1a1a` |

## Out of Scope
- After Effects (.aep) support
- Layer editing
