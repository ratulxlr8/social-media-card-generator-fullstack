# Project Context Index

This file serves as the main entry point for AI assistants to understand the project architecture, rules, and specific context.

## 📁 Knowledge Base
Detailed documentation on the codebase:
- [Codebase Knowledge](file:///home/technonext/Projects/social-media-card-generator-fullstack/CODEBASE_KNOWLEDGE.md) — Tech stack, file map, and component details.
- [Project Architecture](file:///home/technonext/Projects/social-media-card-generator-fullstack/PROJECT_ARCHITECTURE.md) — High-level system design.
- [Frontend Architecture](file:///home/technonext/Projects/social-media-card-generator-fullstack/FRONTEND_ARCHITECTURE.md) — UI/UX and React structure.

## 🛠️ Granular Contexts
Additional context files located in the [`.context/`](file:///home/technonext/Projects/social-media-card-generator-fullstack/.context/) directory:
<!-- Add links to your specific context files here -->
- [.context/example-rule.md](file:///home/technonext/Projects/social-media-card-generator-fullstack/.context/example-rule.md) (Placeholder)

## 📜 Core Development Rules
*   **Styling**: Use Tailwind CSS for all styling. Maintain the glassmorphic dark-mode theme.
*   **State**: Use React state for UI logic; use Fabric.js for canvas-specific state.
*   **API**: Follow the 3-tier scraper strategy defined in `services/linkPreviewService.ts`.
