# ADR-014: Design system and theme

## Status

Proposed

## Context

CineTube has useful dark tokens and shadcn primitives but no light/system theme, shared state components, or complete accessible interaction set.

## Decision

Use two brand colors—CineTube red and rating amber—plus neutral semantic tokens. Adopt a 4 px base grid, 10 px base radius, documented type/shadow/motion/z-index scales, and light/dark/system modes. A small hydration-safe ThemeProvider persists preference and resolves system theme before paint. Reuse shadcn/Base UI primitives; add only the required shared components and a shadcn Chart layer over Recharts.

## Alternatives Considered

Remain dark-only; add a second component system; duplicate page-specific wrappers; use bespoke SVG charts.

## Trade-offs

Light mode exposes hardcoded dark classes that must be migrated gradually. Recharts adds bundle weight only to admin routes.

## Positive Consequences

Consistent theming, accessibility, and reusable UI states across public, auth, and admin layouts.

## Negative Consequences

Token migration and visual regression review are required.

## Migration Impact

Define tokens first, then primitives, then feature pages; preserve existing red identity.

## Security Impact

No security behavior changes; focus visibility and confirmation dialogs reduce destructive-action mistakes.

## Data Impact

None.

## Validation Method

Theme hydration tests, contrast checks, keyboard tests, reduced-motion checks, and visual review at target breakpoints.

## Rollback or Reversal Strategy

Default to dark while retaining semantic tokens; feature pages can migrate independently.
