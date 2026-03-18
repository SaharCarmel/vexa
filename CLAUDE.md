# Vexa Project Guidelines

## Build Verification

**CRITICAL RULE**: Before pushing any changes to services that have a build step (e.g., Next.js, TypeScript), you MUST run the build locally and verify it passes. Never push code that hasn't been verified to compile.

- For `services/vexa-dashboard`: Run `cd services/vexa-dashboard && npx next build` and verify "Compiled successfully" before committing.
- For any TypeScript service: Run the appropriate build/typecheck command before pushing.

This rule exists because Railway auto-deploys on push, and broken builds waste deploy minutes and cause downtime.
