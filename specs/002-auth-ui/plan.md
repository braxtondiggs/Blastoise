# Implementation Plan: Authentication UI Components

**Branch**: `002-auth-ui` | **Date**: 2025-01-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-auth-ui/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build complete authentication UI components for the Blastoise application, providing login, registration, onboarding, and account upgrade flows. The implementation will create Angular standalone components with DaisyUI styling that integrate with the existing `AuthService` at `libs/features/auth/src/lib/services/auth.ts`. The UI will support three authentication modes: email/password sign-in, magic link authentication, and anonymous browsing. All forms will use Angular reactive forms with real-time validation, display loading states during operations, and provide accessible, keyboard-navigable interfaces that meet WCAG 2.1 AA standards.

## Technical Context

**Language/Version**: TypeScript 5.x with Angular 20+
**Primary Dependencies**: Angular 20+ (standalone components, signals, reactive forms), DaisyUI/Tailwind CSS 4.x, Supabase JS Client 2.x, Angular Router
**Storage**: localStorage for anonymous mode persistence, Supabase PostgreSQL for authenticated user data
**Testing**: Jest for unit/integration tests, Playwright for E2E tests
**Target Platform**: Web (Angular PWA) + Mobile (Capacitor 7+ wrapper for iOS/Android)
**Project Type**: Web + Mobile (Nx monorepo with shared feature libraries)
**Performance Goals**: Form submission < 50ms to loading state, validation feedback < 100ms, auth flow completion < 30 seconds
**Constraints**: Inline Tailwind CSS only (no separate CSS files), WCAG 2.1 AA accessibility compliance, bundle size budget < 2MB initial load
**Scale/Scope**: 6 main components (login, registration, onboarding, upgrade-prompt, password-reset, auth-callback), 8 user stories, ~2000 LOC expected

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality & Structure ✅ PASS
- **Status**: COMPLIANT
- **Evidence**: Feature will use existing Nx workspace structure (`libs/features/auth`), follow Angular standalone component patterns, use established linting/formatting standards
- **Action**: None required

### II. Testing Excellence ✅ PASS
- **Status**: COMPLIANT
- **Evidence**: Spec includes 10 unit tests, 3 integration tests, 2 E2E tests as success criteria. Tests will be written for all form validation logic, auth flows, and critical user journeys
- **Action**: None required

### III. User Experience Consistency ✅ PASS
- **Status**: COMPLIANT
- **Evidence**: All components will use DaisyUI for design consistency, meet WCAG 2.1 AA accessibility standards (FR-026, SC-006), support keyboard navigation (FR-025), work across web/mobile platforms
- **Action**: None required

### IV. Performance Optimization ✅ PASS
- **Status**: COMPLIANT
- **Evidence**: Performance targets defined: loading state < 50ms (SC-008), validation < 100ms (SC-007), auth completion < 30 seconds (SC-002). No heavy dependencies added beyond existing stack
- **Action**: None required

### V. Privacy & Ethical Data Handling ✅ PASS
- **Status**: COMPLIANT
- **Evidence**: Anonymous mode (FR-010 to FR-013) provides consent-free usage option. No location data collected by auth UI. User can start using app without providing any personal information
- **Action**: None required

**Overall Gate Status**: ✅ ALL GATES PASSED - Proceed to Phase 0 Research

## Project Structure

### Documentation (this feature)

```text
specs/002-auth-ui/
├── spec.md              # Feature specification (already created)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (N/A for frontend-only feature)
├── checklists/
│   └── requirements.md  # Spec validation checklist (already created)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
libs/features/auth/                           # Existing feature library
├── src/
│   ├── index.ts                              # Public API exports
│   ├── lib/
│   │   ├── components/                       # UI Components (TO BE IMPLEMENTED)
│   │   │   ├── login.ts                      # ✅ EXISTS (placeholder) - Login form component
│   │   │   ├── login.spec.ts                 # ✅ EXISTS (placeholder) - Login tests
│   │   │   ├── registration.ts               # NEW - Registration form component
│   │   │   ├── registration.spec.ts          # NEW - Registration tests
│   │   │   ├── onboarding.ts                 # ✅ EXISTS (placeholder) - Onboarding wizard
│   │   │   ├── onboarding.spec.ts            # ✅ EXISTS (placeholder) - Onboarding tests
│   │   │   ├── upgrade-prompt.ts             # ✅ EXISTS (placeholder) - Upgrade prompt
│   │   │   ├── upgrade-prompt.spec.ts        # ✅ EXISTS (placeholder) - Upgrade tests
│   │   │   ├── password-reset.ts             # NEW - Password reset component
│   │   │   ├── password-reset.spec.ts        # NEW - Password reset tests
│   │   │   ├── auth-callback.ts              # NEW - Magic link callback handler
│   │   │   └── auth-callback.spec.ts         # NEW - Callback tests
│   │   ├── services/
│   │   │   ├── auth.ts                       # ✅ EXISTS (COMPLETE) - Auth service
│   │   │   ├── auth.spec.ts                  # ✅ EXISTS - Auth service tests
│   │   │   ├── form-validators.ts            # NEW - Custom form validators (email, password)
│   │   │   └── form-validators.spec.ts       # NEW - Validator tests
│   │   ├── guards/
│   │   │   ├── auth-guard.ts                 # ✅ EXISTS - Route guard
│   │   │   └── auth-guard.spec.ts            # ✅ EXISTS - Guard tests
│   │   └── auth/
│   │       ├── auth.ts                       # ✅ EXISTS - Legacy auth file
│   │       └── auth.spec.ts                  # ✅ EXISTS - Legacy auth tests
│   └── test-setup.ts                         # ✅ EXISTS - Jest configuration
├── jest.config.ts                            # ✅ EXISTS - Jest configuration
├── project.json                              # ✅ EXISTS - Nx project configuration
├── tsconfig.json                             # ✅ EXISTS - TypeScript configuration
├── tsconfig.lib.json                         # ✅ EXISTS - Library TypeScript config
└── tsconfig.spec.json                        # ✅ EXISTS - Test TypeScript config

libs/shared/auth-state/                       # Existing shared auth state
└── src/
    ├── index.ts                              # ✅ EXISTS - Public API
    └── lib/
        ├── auth-state.service.ts             # ✅ EXISTS - Shared auth signals
        └── auth-state.service.spec.ts        # ✅ EXISTS - State tests

apps/web/src/app/                             # Web application routes
├── app.routes.ts                             # TO BE UPDATED - Add auth routes
└── pages/
    └── auth/                                 # NEW - Auth page wrappers
        ├── login-page.ts                     # NEW - Login page wrapper
        ├── register-page.ts                  # NEW - Registration page wrapper
        └── password-reset-page.ts            # NEW - Password reset page wrapper

apps/mobile/src/app/                          # Mobile application routes
├── app.routes.ts                             # TO BE UPDATED - Add auth routes
└── pages/
    └── auth/                                 # NEW - Auth page wrappers
        ├── login-page.ts                     # NEW - Login page wrapper
        ├── register-page.ts                  # NEW - Registration page wrapper
        └── password-reset-page.ts            # NEW - Password reset page wrapper

apps/web-e2e/src/                            # E2E tests for web
└── auth/
    ├── login.spec.ts                         # NEW - Login E2E tests
    ├── registration.spec.ts                  # NEW - Registration E2E tests
    ├── onboarding.spec.ts                    # NEW - Onboarding E2E tests
    └── upgrade.spec.ts                       # NEW - Upgrade flow E2E tests
```

**Structure Decision**: This feature enhances the existing `libs/features/auth` library by implementing UI components for authentication flows. The structure follows the established Nx monorepo pattern:

1. **Shared Feature Library** (`libs/features/auth`): Contains all reusable auth components, services, and guards that work across both web and mobile platforms
2. **Application Pages** (`apps/web/`, `apps/mobile/`): Thin page wrappers that consume shared components and handle platform-specific routing
3. **E2E Tests** (`apps/web-e2e/`, `apps/api-e2e/`): End-to-end tests for complete user journeys

This approach maximizes code reuse between web and mobile while maintaining clean boundaries and testability.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitutional violations detected. This feature aligns with all constitutional principles and requires no complexity justification.

---

## Phase 1 Design Complete - Constitution Re-evaluation

*Re-checked after completing research.md, data-model.md, and quickstart.md*

### Constitution Check Results (Post-Design)

**I. Code Quality & Structure** ✅ PASS (unchanged)
- Research confirms adherence to Angular standalone component patterns
- Data model uses TypeScript interfaces for type safety
- Project structure follows established Nx conventions

**II. Testing Excellence** ✅ PASS (unchanged)
- Quickstart includes comprehensive testing guide
- Research documents testable patterns (reactive forms, form validators)
- Data model defines clear interfaces for testing

**III. User Experience Consistency** ✅ PASS (unchanged)
- Research confirms DaisyUI usage for consistency
- Accessibility patterns documented (ARIA labels, keyboard navigation)
- Responsive design covered in quickstart

**IV. Performance Optimization** ✅ PASS (unchanged)
- Performance goals confirmed achievable (<50ms loading states, <100ms validation)
- No heavy dependencies introduced
- Lightweight form validation with minimal overhead

**V. Privacy & Ethical Data Handling** ✅ PASS (unchanged)
- Anonymous mode fully documented in data model
- localStorage-only persistence for anonymous users (no backend tracking)
- Clear user consent flow in onboarding

**Overall Gate Status**: ✅ ALL GATES PASSED - Ready for Phase 2 (Task Generation)

---

## Next Steps

Phase 0 (Research) and Phase 1 (Design & Contracts) are complete. The feature is ready for task breakdown.

**To generate implementation tasks**, run:

```bash
/speckit.tasks
```

This will create `specs/002-auth-ui/tasks.md` with a detailed, prioritized task list for implementing the authentication UI components.

### Generated Artifacts

✅ **Phase 0 - Research**:
- [research.md](./research.md) - 10 technical decisions with rationale

✅ **Phase 1 - Design**:
- [data-model.md](./data-model.md) - 11 data entities and state management
- [quickstart.md](./quickstart.md) - 15-minute setup and testing guide
- [plan.md](./plan.md) - This implementation plan (complete)

**Phase 2 - Tasks** (pending):
- tasks.md - Will be generated by `/speckit.tasks` command
