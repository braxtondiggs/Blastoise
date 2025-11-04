<!--
═══════════════════════════════════════════════════════════════════════════
SYNC IMPACT REPORT
═══════════════════════════════════════════════════════════════════════════

Version Change: 1.0.0 → 1.1.0 (Testing policy relaxed for rapid development)

Rationale: MINOR version (1.1.0) - Updated Principle II to make testing optional
for faster iteration and MVP development. Breaking change to development workflow
but maintains backward compatibility.

Modified Principles:
  - UPDATED: II. Testing Excellence (MUST → SHOULD, REQUIRED → RECOMMENDED)

Modified Sections:
  - Development Workflow: Quality Gates updated (tests now optional)

Added Sections:
  - Amendment History

Removed Sections:
  - None

Template Updates:
  ⚠️  .specify/templates/tasks-template.md
     - Tests can now be marked as OPTIONAL in task breakdown
     - TDD approach remains recommended but not enforced
  ⚠️  .specify/templates/plan-template.md
     - Constitution checks should note tests are RECOMMENDED, not REQUIRED
  ✅ .specify/templates/spec-template.md
     - No changes needed (spec remains technology-agnostic)
  ✅ .specify/templates/checklist-template.md
     - No changes needed (generic template)

Follow-up TODOs:
  - Update task templates to reflect optional testing policy
  - Document testing best practices in CLAUDE.md
  - Clarify when tests SHOULD vs MAY be written

═══════════════════════════════════════════════════════════════════════════
-->

# Blastoise Constitution

## Core Principles

### I. Code Quality & Structure

Code MUST be clean, modular, and maintainable with consistent structure across the Nx
workspace. All code MUST adhere to established linting and formatting standards without
exception.

**Rationale**: Consistent code structure and quality standards ensure long-term
maintainability, reduce technical debt, and enable team scalability. The Nx monorepo
architecture requires strict adherence to organizational patterns to prevent chaos as
the codebase grows.

**Requirements**:
- Follow Nx workspace conventions for project organization
- Pass all linting checks before commit
- Use automated formatters (Prettier, ESLint, etc.)
- Maintain clear module boundaries and separation of concerns
- Document architectural decisions in code when non-obvious

### II. Testing Excellence

Every feature SHOULD include comprehensive unit and integration tests, automated where
possible, to ensure reliability and prevent regressions. Testing is encouraged but not
strictly required for all features.

**Rationale**: Testing provides significant value for reliability and preventing
regressions. However, rapid prototyping and MVP development may prioritize shipping
features quickly. Tests can be added later when features stabilize.

**Requirements**:
- Unit tests RECOMMENDED for all business logic and utilities
- Integration tests RECOMMENDED for critical user journeys
- Contract tests RECOMMENDED for API boundaries
- E2E tests are OPTIONAL and may be skipped for faster iteration
- Tests SHOULD be automated and run in CI/CD pipeline when present
- TDD approach is encouraged but not mandatory
- Coverage thresholds are aspirational, not blocking

### III. User Experience Consistency

User experience MUST remain consistent and intuitive across web and mobile platforms,
prioritizing accessibility, responsiveness, and offline capability.

**Rationale**: Users expect seamless experiences regardless of device or network
conditions. Inconsistent UX creates confusion and erodes trust. Accessibility is not a
feature—it is a fundamental requirement that ensures our application serves all users
equitably.

**Requirements**:
- Design system enforced across all platforms
- WCAG 2.1 AA accessibility standards MUST be met
- Responsive design for all screen sizes
- Offline-first architecture with Progressive Web App (PWA) capabilities
- Touch and keyboard navigation fully supported
- Consistent error messaging and user feedback patterns

### IV. Performance Optimization

Performance is a non-negotiable requirement. Data fetching, map rendering, and
background processing MUST be optimized for speed, low battery usage, and minimal
bandwidth consumption.

**Rationale**: Performance directly impacts user satisfaction and retention. Slow
applications frustrate users and drain device resources. Mobile users, especially
those on limited data plans or older devices, depend on efficient applications.

**Requirements**:
- Page load times < 3 seconds on 3G networks
- First Contentful Paint (FCP) < 1.5 seconds
- Map rendering optimized with lazy loading and clustering
- Background location tracking MUST minimize battery drain
- Data caching strategies to reduce network requests
- Bundle size monitoring and optimization
- Performance budgets enforced in CI/CD

### V. Privacy & Ethical Data Handling

Privacy, transparency, and ethical data handling remain core principles. No feature may
compromise user consent or expose identifiable location data without explicit, informed
user permission.

**Rationale**: Users entrust us with sensitive location data. This trust is sacred and
must never be violated. Privacy regulations (GDPR, CCPA, etc.) are minimum baselines—
our ethical standards exceed legal requirements.

**Requirements**:
- Explicit user consent required before any location tracking
- Granular privacy controls with clear explanations
- Location data MUST be encrypted at rest and in transit
- No third-party data sharing without explicit user opt-in
- Data retention policies clearly communicated and enforced
- Privacy-by-design in all feature planning
- Regular privacy impact assessments for new features
- User data deletion capabilities always available

## Technology Standards

**Workspace Architecture**: Nx monorepo with strict workspace boundaries and dependency
rules.

**Code Quality Tools**:
- ESLint for JavaScript/TypeScript linting
- Prettier for code formatting
- Husky for pre-commit hooks
- Nx affected commands for efficient CI/CD

**Required Standards**:
- All projects MUST pass `nx lint` and `nx format:check` before merge
- Shared libraries MUST have clearly defined public APIs
- Circular dependencies are strictly prohibited
- Nx dependency constraints MUST be enforced

## Development Workflow

**Branching Strategy**: Feature branches from main with pull request reviews required.

**Quality Gates**:
1. Tests pass (if present) (`nx affected:test`)
2. Linting passes (`nx affected:lint`)
3. Build succeeds (`nx affected:build`)
4. Performance budgets met (for user-facing features)
5. Accessibility checks pass (for UI components)
6. Code review approved by at least one team member (recommended)

**Commit Standards**:
- Conventional commits format enforced
- Commits MUST be atomic and meaningful
- Breaking changes MUST be clearly documented

**Review Process**:
- All code changes require pull request review
- Reviewers MUST verify constitution compliance
- Performance impact MUST be assessed for user-facing changes
- Privacy implications MUST be considered for data-related changes

## Governance

This constitution supersedes all other development practices and guidelines. All team
members MUST adhere to these principles without exception.

**Amendment Process**:
- Amendments require documented justification and team consensus
- Major changes require migration plan for existing code
- All amendments MUST be versioned and dated
- Breaking changes to principles increment MAJOR version
- New principles or expanded guidance increment MINOR version
- Clarifications and fixes increment PATCH version

**Compliance Review**:
- All pull requests MUST verify compliance with constitutional principles
- Feature proposals MUST include constitutional impact assessment
- Quarterly reviews to ensure ongoing adherence
- Violations MUST be addressed immediately with corrective action plan

**Complexity Justification**:
- Any deviation from simplicity MUST be explicitly justified
- Alternative simpler approaches MUST be documented and rejected with clear reasoning
- Technical debt introduced MUST have repayment plan

**Constitutional Authority**:
- In case of conflict between this constitution and other guidelines, the constitution
  takes precedence
- Project leads are responsible for constitutional enforcement
- Team members have duty to flag constitutional violations

**Version**: 1.1.0 | **Ratified**: 2025-10-28 | **Last Amended**: 2025-11-03

**Amendment History**:
- **1.1.0** (2025-11-03): Updated Principle II (Testing Excellence) to make tests RECOMMENDED instead of REQUIRED. E2E tests are now OPTIONAL. Quality gates updated to reflect testing is optional for rapid prototyping and MVP development.
