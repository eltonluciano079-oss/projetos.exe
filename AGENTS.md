# AGENTS.md — Project instructions for Codex

## Collaboration
ChatGPT acts as design strategist, researcher, product planner, reviewer and QA lead. Codex acts as implementation engineer. Before coding, inspect the repository and existing features. Never claim a change was made without a verified commit and test. The repository is the source of truth; do not edit through Lovable unless explicitly requested for this project. Preserve working functionality, make minimal targeted changes, and commit to main only when the user asks for implementation. Report changed files, commit SHA, branch, tests, and preview status.

## Design priority
Prioritize premium, distinctive, motion-first landing pages and apps. Consider animated objects or characters, GSAP/ScrollTrigger scroll-driven sequences, Rive interactive characters, Spline/Three.js/WebGL 3D, cursor and hover interaction, and carefully composed transitions. Use the smallest suitable technique; avoid heavy effects without clear value. Build semantic, responsive, accessible UI; honor prefers-reduced-motion, mobile performance, keyboard navigation and readable contrast. Do not invent characters or photos when project requirements prohibit them.

## Design workflow
1. Audit existing code, UX, branding and constraints; gather references.
2. Create or update a project-specific DESIGN.md with color tokens, typography, layout grid, spacing, components, assets, motion storyboard, breakpoints and acceptance criteria. Translate visual references into original design language; do not copy protected branding or media.
3. Implement frontend in small reviewable steps. Keep backend changes for the agreed project phase; use Supabase/Vercel only where required.
4. Triple review: (a) visual fidelity and motion timing; (b) interactions, functionality, responsiveness and accessibility; (c) code quality, performance, dependencies, licensing and regression tests. Verify on mobile and desktop.

## Reference library — consult as needed, not blanket dependencies
- Figma Mockup Resource Guide: Figma Community, LS Graphics, Craftwork, UI8, Shots.so, Rotato, Mockuuups Studio.
- 200+ Colour Combinations: 220 four-HEX palettes in 11 color families.
- The Ultimate Portfolio Vault (@figma.expert): portfolios, studios, galleries, UX, motion, templates, typography, animation and assets.
- Visual discovery: @uiuxaadi, Pixlpin https://pixlpin.com/, Mobbin, Awwwards, Godly, Land-book, Dribbble, Behance.
- Typography: Typebook https://typebook.com/; verify font license.
- Components: Blocks.so https://blocks.so/, shadcn/ui, Tailwind.
- Visual effects: GetLayers AI https://www.getlayers.ai/docs, GSAP, Motion, Rive, Spline, Three.js.
- Motion demo skill: Stageshow https://github.com/benjitaylor/skills ; install only when requested/approved and check security/compatibility.
- Design kits/prompts/assets: Mahero https://www.mahero.supply/.
- Agent-readable design language: GetDesign https://getdesign.ai/ (DESIGN.md reference; check license/access).
- Motion-first website prompts, 3D and MCP: MotionSites https://motionsites.ai/ ; paid access may be required.
- User video benchmark: https://youtu.be/aUwxrsHU73g ; video content not yet inspected, so do not infer details.

## Project-specific constraints
For Barbearia WM: preserve existing functionality and structure; black and gold identity, logo motif, consistent glass-style buttons, single professional, no fictional professionals/photos. Prioritize spacing and legibility. Backend is a later phase unless user changes scope.

## Activation phrase
When user says “essa é da boa”, use the integrated design → implementation → backend/deploy workflow as applicable, subject to available connections and explicit authorization. Never silently deploy, purchase assets, install third-party packages, or alter unrelated files.
