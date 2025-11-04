# Tasks: Authentication UI Components

**Input**: Design documents from `/specs/002-auth-ui/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Tests are MANDATORY per the project constitution - every feature must include comprehensive unit and integration tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is an Nx monorepo with the following structure:

- **Shared Feature Library**: `libs/features/auth/src/lib/`
- **App Pages**: `apps/web/src/app/pages/auth/` and `apps/mobile/src/app/pages/auth/`
- **E2E Tests**: `apps/web-e2e/src/auth/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify environment and create foundational utilities needed by all user stories

- [x] T001 Verify Supabase configuration in apps/web/.env and apps/mobile/.env (SUPABASE_URL, SUPABASE_ANON_KEY)
- [x] T002 [P] Create form validators service in libs/features/auth/src/lib/services/form-validators.ts with email, password strength, and match validators
- [x] T003 [P] Create form validators unit tests in libs/features/auth/src/lib/services/form-validators.spec.ts (email validation, password strength, confirm password match)
- [x] T004 [P] Create FormValidationError types in libs/shared/models/validation.ts with ValidationErrorCode enum and FormValidationError interface
- [x] T005 [P] Update libs/features/auth/src/index.ts to export form validators and validation types

**Checkpoint**: Foundation utilities ready - all user stories can now import validators and types

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core shared components that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create auth page directory structure: apps/web/src/app/pages/auth/ and apps/mobile/src/app/pages/auth/
- [x] T007 [P] Create shared loading state signal utility in libs/shared/utils/loading-state.ts (reusable across all auth components)
- [x] T008 [P] Create shared error handling utility in libs/shared/utils/error-messages.ts (maps Supabase errors to user-friendly messages)
- [x] T009 Verify existing AuthService methods are available: signInWithPassword, signInWithMagicLink, signUp, enableAnonymousMode, upgradeToAuthenticated in libs/features/auth/src/lib/services/auth.ts
- [x] T010 Verify existing AuthStateService signals are available: isAuthenticated, isAnonymous, currentUser, session in libs/shared/auth-state/src/lib/auth-state.service.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Quick Start with Anonymous Mode (Priority: P0) 🎯 MVP

**Goal**: Enable new users to try the app immediately without creating an account. Clicking "Continue as Guest" enables anonymous mode with local visit storage.

**Independent Test**: Open app, click "Continue as Guest", track a visit locally in IndexedDB, close and reopen app to verify anonymous state persists.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T011 [P] [US1] Unit test for anonymous mode persistence in libs/features/auth/src/lib/components/login.spec.ts (localStorage flags set correctly)
- [x] T012 [P] [US1] Integration test for anonymous user creation in libs/features/auth/src/lib/services/auth.spec.ts (AuthService.enableAnonymousMode creates anonymous user)
- [x] T013 [P] [US1] E2E test for anonymous mode flow in apps/web-e2e/src/auth/anonymous.spec.ts (click "Continue as Guest", verify redirect to main app, verify localStorage flags)

### Implementation for User Story 1

- [x] T014 [P] [US1] Update login component in libs/features/auth/src/lib/components/login.ts: Add "Continue as Guest" button with click handler that calls AuthService.enableAnonymousMode()
- [x] T015 [P] [US1] Update login component template in libs/features/auth/src/lib/components/login.ts: Add DaisyUI button with inline Tailwind classes, wire to onContinueAsGuest() method
- [x] T016 [P] [US1] Add ARIA labels to "Continue as Guest" button in libs/features/auth/src/lib/components/login.ts (aria-label="Start using Blastoise without creating an account")
- [x] T017 [US1] Create login page wrapper for web in apps/web/src/app/pages/auth/login-page.ts (standalone component that imports LoginComponent from libs/features/auth)
- [x] T018 [US1] Create login page wrapper for mobile in apps/mobile/src/app/pages/auth/login-page.ts (standalone component that imports LoginComponent from libs/features/auth)
- [x] T019 [US1] Add login route to apps/web/src/app/app.routes.ts (path: 'auth/login', component: LoginPageComponent)
- [x] T020 [US1] Add login route to apps/mobile/src/app/app.routes.ts (path: 'auth/login', component: LoginPageComponent)
- [x] T021 [US1] Update root route in apps/web/src/app/app.routes.ts to redirect unauthenticated users to /auth/login
- [x] T022 [US1] Update root route in apps/mobile/src/app/app.routes.ts to redirect unauthenticated users to /auth/login

**Checkpoint**: At this point, User Story 1 (anonymous mode) should be fully functional and testable independently. Users can click "Continue as Guest" and start using the app.

---

## Phase 4: User Story 2 - Email/Password Sign In (Priority: P1)

**Goal**: Allow returning users to sign into their accounts with email and password. Form validates inputs, shows loading state, and redirects to app on success.

**Independent Test**: Create test account, sign out, sign back in with email/password, verify session persists across browser refresh.

### Tests for User Story 2 ⚠️

- [x] T023 [P] [US2] Unit test for login form validation in libs/features/auth/src/lib/components/login.spec.ts (email format, password min length, updateOn blur)
- [x] T024 [P] [US2] Unit test for loading state management in libs/features/auth/src/lib/components/login.spec.ts (isLoading signal, form disabled during submit)
- [x] T025 [P] [US2] Integration test for email/password sign-in in libs/features/auth/src/lib/services/auth.spec.ts (successful login, session created)
- [x] T026 [P] [US2] Integration test for invalid credentials in libs/features/auth/src/lib/services/auth.spec.ts (error message displayed)
- [x] T027 [P] [US2] E2E test for login flow in apps/web-e2e/src/auth/login.spec.ts (enter credentials, submit, verify redirect to main app)

### Implementation for User Story 2

- [x] T028 [P] [US2] Implement reactive form in libs/features/auth/src/lib/components/login.ts: Create FormGroup with email/password controls, add Validators.required, Validators.email, Validators.minLength(8), set updateOn: 'blur'
- [x] T029 [P] [US2] Implement form submission handler in libs/features/auth/src/lib/components/login.ts: onSubmit() method that sets isLoading, calls AuthService.signInWithPassword(), handles success/error
- [x] T030 [P] [US2] Add inline validation error messages in libs/features/auth/src/lib/components/login.ts template: Show error spans with role="alert" when form control is invalid and touched
- [x] T031 [P] [US2] Add loading state to submit button in libs/features/auth/src/lib/components/login.ts template: Disable button when isLoading or form invalid, show DaisyUI loading spinner
- [x] T032 [P] [US2] Add ARIA attributes to form elements in libs/features/auth/src/lib/components/login.ts: aria-required, aria-invalid, aria-describedby for error messages, aria-busy on form
- [x] T033 [P] [US2] Style login form with DaisyUI classes in libs/features/auth/src/lib/components/login.ts template: card, card-body, form-control, input, input-bordered, btn, btn-primary, label
- [x] T034 [US2] Implement error message mapping in libs/features/auth/src/lib/components/login.ts: Map Supabase errors (Invalid login credentials, etc.) to user-friendly messages from error-messages.ts utility
- [x] T035 [US2] Add session persistence check on component init in libs/features/auth/src/lib/components/login.ts: If user already authenticated (check AuthStateService.isAuthenticated), redirect to '/'
- [x] T036 [US2] Add "Forgot Password?" link to login form template in libs/features/auth/src/lib/components/login.ts (link to /auth/password-reset)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can sign in with email/password OR continue as guest.

---

## Phase 5: User Story 3 - Magic Link Authentication (Priority: P1)

**Goal**: Provide passwordless authentication via email magic link. User enters email, receives link, clicks link to authenticate without password.

**Independent Test**: Request magic link to test email, click link in email, verify authentication succeeds without entering password.

### Tests for User Story 3 ⚠️

- [x] T037 [P] [US3] Unit test for magic link form in libs/features/auth/src/lib/components/login.spec.ts (email-only form, mode toggle between password/magic-link)
- [x] T038 [P] [US3] Unit test for magic link success message in libs/features/auth/src/lib/components/login.spec.ts (success message shows "Check your email")
- [x] T039 [P] [US3] Integration test for magic link request in libs/features/auth/src/lib/services/auth.spec.ts (AuthService.signInWithMagicLink sends email)
- [x] T040 [P] [US3] E2E test for magic link flow in apps/web-e2e/src/auth/magic-link.spec.ts (request link, verify callback page loads, verify authentication)

### Implementation for User Story 3

- [x] T041 [P] [US3] Add mode signal to login component in libs/features/auth/src/lib/components/login.ts: mode = signal<'password' | 'magic-link'>('password')
- [x] T042 [P] [US3] Add tab navigation to login template in libs/features/auth/src/lib/components/login.ts: DaisyUI tabs for switching between password and magic link modes
- [x] T043 [P] [US3] Conditionally show password field in login template in libs/features/auth/src/lib/components/login.ts: @if (mode() === 'password') show password input, else hide it
- [x] T044 [P] [US3] Update form submission handler in libs/features/auth/src/lib/components/login.ts: Check mode(), call signInWithMagicLink if mode is 'magic-link', else call signInWithPassword
- [x] T045 [P] [US3] Add success message signal in libs/features/auth/src/lib/components/login.ts: showSuccessMessage = signal(false), set to true after magic link sent
- [x] T046 [P] [US3] Display success message in login template in libs/features/auth/src/lib/components/login.ts: @if (showSuccessMessage()) show DaisyUI alert with "Check your email for a sign-in link"
- [x] T047 [P] [US3] Auto-dismiss success message after 5 seconds in libs/features/auth/src/lib/components/login.ts: setTimeout(() => showSuccessMessage.set(false), 5000)
- [x] T048 [P] [US3] Create auth callback component in libs/features/auth/src/lib/components/auth-callback.ts: Standalone component with isProcessing and error signals, ngOnInit checks session
- [x] T049 [P] [US3] Create auth callback template in libs/features/auth/src/lib/components/auth-callback.ts: Show loading spinner while processing, show error alert if token invalid, redirect to '/' on success
- [x] T050 [P] [US3] Add ARIA labels to callback component in libs/features/auth/src/lib/components/auth-callback.ts: aria-live="polite" on loading message, role="alert" on error
- [x] T051 [US3] Create callback page wrapper for web in apps/web/src/app/pages/auth/callback-page.ts (imports AuthCallbackComponent)
- [x] T052 [US3] Create callback page wrapper for mobile in apps/mobile/src/app/pages/auth/callback-page.ts (imports AuthCallbackComponent)
- [x] T053 [US3] Add callback route to apps/web/src/app/app.routes.ts (path: 'auth/callback', component: CallbackPageComponent)
- [x] T054 [US3] Add callback route to apps/mobile/src/app/app.routes.ts (path: 'auth/callback', component: CallbackPageComponent)
- [x] T055 [US3] Update AuthService redirectTo URL in libs/features/auth/src/lib/services/auth.ts if needed: Ensure magic link redirects to /auth/callback

**Checkpoint**: At this point, User Stories 1, 2, AND 3 all work independently. Users can sign in with password, magic link, or continue as guest.

---

## Phase 6: User Story 4 - New Account Registration (Priority: P1)

**Goal**: Allow new users to create accounts with email, password, and confirmation. Form validates password strength with checklist, creates Supabase account on submit.

**Independent Test**: Fill out registration form with new email, submit, verify account created in Supabase, user authenticated immediately.

### Tests for User Story 4 ⚠️

- [x] T056 [P] [US4] Unit test for registration form validation in libs/features/auth/src/lib/components/registration.spec.ts (email, password, confirmPassword, agreeToTerms validators)
- [x] T057 [P] [US4] Unit test for password strength checklist in libs/features/auth/src/lib/components/registration.spec.ts (hasMinLength, hasLetter, hasNumber signals update correctly)
- [x] T058 [P] [US4] Unit test for confirm password match in libs/features/auth/src/lib/components/registration.spec.ts (passwords must match validator)
- [x] T059 [P] [US4] Integration test for account creation in libs/features/auth/src/lib/services/auth.spec.ts (AuthService.signUp creates account)
- [x] T060 [P] [US4] Integration test for duplicate email in libs/features/auth/src/lib/services/auth.spec.ts (error shown when email already registered)
- [x] T061 [P] [US4] E2E test for registration flow in apps/web-e2e/src/auth/registration.spec.ts (fill form, submit, verify redirect to app)

### Implementation for User Story 4

- [x] T062 [P] [US4] Create registration component in libs/features/auth/src/lib/components/registration.ts: Standalone component with ReactiveFormsModule, CommonModule, RouterModule imports
- [x] T063 [P] [US4] Create registration reactive form in libs/features/auth/src/lib/components/registration.ts: FormGroup with email, password, confirmPassword, agreeToTerms controls
- [x] T064 [P] [US4] Add password strength validator to registration form in libs/features/auth/src/lib/components/registration.ts: Use passwordStrengthValidator from form-validators.ts
- [x] T065 [P] [US4] Add confirm password match validator to registration form in libs/features/auth/src/lib/components/registration.ts: Custom validator that checks password === confirmPassword
- [x] T066 [P] [US4] Create password strength signals in libs/features/auth/src/lib/components/registration.ts: Compute hasMinLength, hasLetter, hasNumber from form.controls.password.value
- [x] T067 [P] [US4] Create registration template in libs/features/auth/src/lib/components/registration.ts: DaisyUI card with form-control, input, checkbox, btn styling
- [x] T068 [P] [US4] Add password strength checklist to template in libs/features/auth/src/lib/components/registration.ts: UL with LI items showing ✓ or ○ based on password strength signals
- [x] T069 [P] [US4] Add inline error messages to template in libs/features/auth/src/lib/components/registration.ts: Show validation errors for each field with role="alert"
- [x] T070 [P] [US4] Add loading state to submit button in libs/features/auth/src/lib/components/registration.ts: Disable when isLoading or form invalid, show spinner
- [x] T071 [P] [US4] Add ARIA attributes to registration form in libs/features/auth/src/lib/components/registration.ts: aria-required, aria-invalid, aria-describedby, aria-busy
- [x] T072 [P] [US4] Implement form submission handler in libs/features/auth/src/lib/components/registration.ts: onSubmit() calls AuthService.signUp, handles success/error, redirects to '/' on success
- [x] T073 [P] [US4] Add error message mapping in libs/features/auth/src/lib/components/registration.ts: Map Supabase "User already registered" to user-friendly message
- [x] T074 [P] [US4] Add "Already have an account? Sign in" link to template in libs/features/auth/src/lib/components/registration.ts (link to /auth/login)
- [x] T075 [US4] Create registration page wrapper for web in apps/web/src/app/pages/auth/register-page.ts (imports RegistrationComponent)
- [x] T076 [US4] Create registration page wrapper for mobile in apps/mobile/src/app/pages/auth/register-page.ts (imports RegistrationComponent)
- [x] T077 [US4] Add registration route to apps/web/src/app/app.routes.ts (path: 'auth/register', component: RegisterPageComponent)
- [x] T078 [US4] Add registration route to apps/mobile/src/app/app.routes.ts (path: 'auth/register', component: RegisterPageComponent)
- [x] T079 [US4] Add "Create Account" link to login page in libs/features/auth/src/lib/components/login.ts (link to /auth/register)

**Checkpoint**: All P0 and P1 user stories complete. Users can register, sign in (password or magic link), or use anonymous mode.

---

## Phase 7: User Story 5 - Anonymous to Authenticated Upgrade (Priority: P2)

**Goal**: Allow anonymous users to upgrade to authenticated accounts while preserving local visit data. Upgrade prompt shows in settings, migrates data on account creation.

**Independent Test**: Use anonymous mode, create test visits, upgrade to account, verify local visits sync to cloud, sign in on new device to see synced visits.

### Tests for User Story 5 ⚠️

- [x] T080 [P] [US5] Unit test for upgrade prompt visibility in libs/features/auth/src/lib/components/upgrade-prompt.spec.ts (only shows when isAnonymous is true)
- [x] T081 [P] [US5] Unit test for local visit count in libs/features/auth/src/lib/components/upgrade-prompt.spec.ts (query IndexedDB, display count)
- [x] T082 [P] [US5] Integration test for account upgrade in libs/features/auth/src/lib/services/auth.spec.ts (AuthService.upgradeToAuthenticated creates account, triggers migration)
- [x] T083 [P] [US5] Integration test for visit migration in libs/features/auth/src/lib/services/auth.spec.ts (local visits copied to Supabase visits table)
- [x] T084 [P] [US5] E2E test for upgrade flow in apps/web-e2e/src/auth/upgrade.spec.ts (anonymous mode → create visit → upgrade → verify visit synced)

### Implementation for User Story 5

- [x] T085 [P] [US5] Update upgrade-prompt component in libs/features/auth/src/lib/components/upgrade-prompt.ts: Add reactive form with email, password, confirmPassword controls
- [x] T086 [P] [US5] Add local visit count signal in libs/features/auth/src/lib/components/upgrade-prompt.ts: Query IndexedDB visits repository, count anonymous visits
- [x] T087 [P] [US5] Add migration status signal in libs/features/auth/src/lib/components/upgrade-prompt.ts: Track 'pending' | 'in-progress' | 'complete' | 'failed'
- [x] T088 [P] [US5] Create upgrade prompt template in libs/features/auth/src/lib/components/upgrade-prompt.ts: DaisyUI modal with form, show visit count and benefits (sync, backup)
- [x] T089 [P] [US5] Add loading state to upgrade button in libs/features/auth/src/lib/components/upgrade-prompt.ts: Show spinner during account creation and migration
- [x] T090 [P] [US5] Implement form submission handler in libs/features/auth/src/lib/components/upgrade-prompt.ts: onSubmit() calls AuthService.upgradeToAuthenticated, tracks migration status
- [x] T091 [P] [US5] Add migration progress indicator in template in libs/features/auth/src/lib/components/upgrade-prompt.ts: Show "Creating account...", "Migrating visits...", "Complete!" messages
- [x] T092 [P] [US5] Add error handling for migration failures in libs/features/auth/src/lib/components/upgrade-prompt.ts: Show retry button if migration fails
- [x] T093 [US5] Update AuthService.upgradeToAuthenticated in libs/features/auth/src/lib/services/auth.ts: After account creation, trigger visit sync service to migrate local visits to cloud
- [x] T094 [US5] Add upgrade prompt to settings page (implementation depends on settings feature, may need to coordinate)

**Checkpoint**: Anonymous users can now upgrade to authenticated accounts while preserving their local data.

---

## Phase 8: User Story 6 - Onboarding Flow (Priority: P2)

**Goal**: Guide first-time users through brief onboarding wizard explaining location permissions, privacy, and authentication options. Skippable, tracked in localStorage.

**Independent Test**: Clear localStorage, open app as new user, verify onboarding shows, navigate through steps, verify doesn't show again on subsequent visits.

### Tests for User Story 6 ⚠️

- [x] T095 [P] [US6] Unit test for onboarding step navigation in libs/features/auth/src/lib/components/onboarding.spec.ts (nextStep, previousStep, skip methods)
- [x] T096 [P] [US6] Unit test for onboarding completion in libs/features/auth/src/lib/components/onboarding.spec.ts (localStorage flag set when complete)
- [x] T097 [P] [US6] Unit test for onboarding visibility logic in libs/features/auth/src/lib/components/onboarding.spec.ts (show if localStorage flag absent)
- [x] T098 [P] [US6] E2E test for onboarding flow in apps/web-e2e/src/auth/onboarding.spec.ts (first visit shows onboarding, second visit doesn't)

### Implementation for User Story 6

- [x] T099 [P] [US6] Update onboarding component in libs/features/auth/src/lib/components/onboarding.ts: Add currentStep signal (default 0), totalSteps = 4
- [x] T100 [P] [US6] Define onboarding steps in libs/features/auth/src/lib/components/onboarding.ts: Array of 4 steps with title and content (Welcome, Location, Privacy, Get Started)
- [x] T101 [P] [US6] Implement navigation methods in libs/features/auth/src/lib/components/onboarding.ts: nextStep(), previousStep(), skip(), complete()
- [x] T102 [P] [US6] Add localStorage completion tracking in libs/features/auth/src/lib/components/onboarding.ts: complete() sets 'onboarding_complete' = 'true'
- [x] T103 [P] [US6] Create onboarding template in libs/features/auth/src/lib/components/onboarding.ts: DaisyUI card with progress dots, step content, Back/Next/Skip buttons
- [x] T104 [P] [US6] Add progress indicator to template in libs/features/auth/src/lib/components/onboarding.ts: Flex row with dots, highlight current step with bg-primary
- [x] T105 [P] [US6] Conditionally show Back/Skip button in template in libs/features/auth/src/lib/components/onboarding.ts: @if (currentStep() > 0) show Back, else show Skip
- [x] T106 [P] [US6] Conditionally show Next/"Get Started" button in template in libs/features/auth/src/lib/components/onboarding.ts: @if (currentStep() < totalSteps - 1) show Next, else show "Get Started"
- [x] T107 [P] [US6] Add ARIA attributes to onboarding navigation in libs/features/auth/src/lib/components/onboarding.ts: aria-label on buttons, role="progressbar" on dots
- [x] T108 [P] [US6] Wire "Get Started" button to show auth options in libs/features/auth/src/lib/components/onboarding.ts: Final screen shows "Sign In" and "Continue as Guest" buttons
- [x] T109 [US6] Add onboarding guard to root route in apps/web/src/app/app.routes.ts: Check localStorage, show onboarding if flag not set
- [x] T110 [US6] Add onboarding guard to root route in apps/mobile/src/app/app.routes.ts: Check localStorage, show onboarding if flag not set

**Checkpoint**: First-time users now see onboarding wizard before accessing the app.

---

## Phase 9: User Story 7 - Password Reset Flow (Priority: P3)

**Goal**: Allow users to reset forgotten passwords via email link. Two-step process: request reset → receive email → click link → set new password.

**Independent Test**: Click "Forgot Password", receive email, click reset link, set new password, sign in with new password successfully.

### Tests for User Story 7 ⚠️

- [x] T111 [P] [US7] Unit test for reset request form in libs/features/auth/src/lib/components/password-reset.spec.ts (email validation, success message)
- [x] T112 [P] [US7] Unit test for new password form in libs/features/auth/src/lib/components/password-reset.spec.ts (password strength, confirmPassword match)
- [x] T113 [P] [US7] Integration test for reset request in libs/features/auth/src/lib/services/auth.spec.ts (Supabase resetPasswordForEmail sends email)
- [x] T114 [P] [US7] Integration test for password update in libs/features/auth/src/lib/services/auth.spec.ts (Supabase updateUser changes password)
- [x] T115 [P] [US7] E2E test for password reset flow in apps/web-e2e/src/auth/password-reset.spec.ts (request → email → reset → sign in)

### Implementation for User Story 7

- [x] T116 [P] [US7] Create password-reset component in libs/features/auth/src/lib/components/password-reset.ts: Standalone component with two modes (request and reset)
- [x] T117 [P] [US7] Add mode signal in libs/features/auth/src/lib/components/password-reset.ts: mode = signal<'request' | 'reset'>('request')
- [x] T118 [P] [US7] Create reset request form in libs/features/auth/src/lib/components/password-reset.ts: FormGroup with email control, Validators.required, Validators.email
- [x] T119 [P] [US7] Create new password form in libs/features/auth/src/lib/components/password-reset.ts: FormGroup with newPassword, confirmPassword controls, password strength validator
- [x] T120 [P] [US7] Create password-reset template in libs/features/auth/src/lib/components/password-reset.ts: DaisyUI card, conditionally show request or reset form based on mode
- [x] T121 [P] [US7] Implement reset request handler in libs/features/auth/src/lib/components/password-reset.ts: Call supabase.auth.resetPasswordForEmail with redirectTo /auth/reset-password
- [x] T122 [P] [US7] Show success message after reset request in libs/features/auth/src/lib/components/password-reset.ts: "Check your email for a password reset link"
- [x] T123 [P] [US7] Detect reset token in URL on component init in libs/features/auth/src/lib/components/password-reset.ts: Check session, if valid show reset form, else show error
- [x] T124 [P] [US7] Implement password update handler in libs/features/auth/src/lib/components/password-reset.ts: Call supabase.auth.updateUser({ password: newPassword })
- [x] T125 [P] [US7] Add loading states and error handling in libs/features/auth/src/lib/components/password-reset.ts: isLoading signal, error signal, disabled buttons
- [x] T126 [P] [US7] Add ARIA attributes to password reset forms in libs/features/auth/src/lib/components/password-reset.ts: aria-required, aria-invalid, role="alert" on errors
- [x] T127 [US7] Create password-reset page wrapper for web in apps/web/src/app/pages/auth/password-reset-page.ts (imports PasswordResetComponent)
- [x] T128 [US7] Create password-reset page wrapper for mobile in apps/mobile/src/app/pages/auth/password-reset-page.ts (imports PasswordResetComponent)
- [x] T129 [US7] Add password-reset route to apps/web/src/app/app.routes.ts (path: 'auth/password-reset', component: PasswordResetPageComponent)
- [x] T130 [US7] Add password-reset route to apps/mobile/src/app/app.routes.ts (path: 'auth/password-reset', component: PasswordResetComponent)
- [x] T131 [US7] Verify "Forgot Password?" link in login component points to /auth/password-reset (should already be added in T036)

**Checkpoint**: Users can now reset forgotten passwords via email link.

---

## Phase 10: User Story 8 - Loading States and Error Handling (Priority: P2)

**Goal**: Ensure all auth operations show loading indicators and user-friendly error messages. Professional UX across all auth flows.

**Independent Test**: Simulate slow network, verify loading states appear. Simulate errors (invalid credentials, network failure), verify user-friendly messages shown.

### Tests for User Story 8 ⚠️

- [x] T132 [P] [US8] Unit test for loading state timing in all auth components: Verify isLoading appears within 50ms of form submission
- [x] T133 [P] [US8] Unit test for error message formatting in all auth components: Verify Supabase errors mapped to user-friendly messages
- [x] T134 [P] [US8] Unit test for form disabling during loading in all auth components: Verify all inputs disabled when isLoading is true
- [x] T135 [P] [US8] E2E test for loading state visibility in apps/web-e2e/src/auth/loading-states.spec.ts: Verify spinner appears on all auth operations

### Implementation for User Story 8

- [x] T136 [P] [US8] Audit all auth components for loading state consistency: login, registration, password-reset, upgrade-prompt, auth-callback (verify isLoading signal exists and used correctly)
- [x] T137 [P] [US8] Audit all auth components for form disabling during loading: Verify [disabled]="isLoading()" on all form inputs
- [x] T138 [P] [US8] Audit all auth components for error message display: Verify error signal exists, mapped via error-messages.ts utility, shown with role="alert"
- [x] T139 [P] [US8] Audit all auth components for aria-busy attribute: Verify form has [attr.aria-busy]="isLoading()" for screen readers
- [x] T140 [P] [US8] Add network error detection to all auth components: Wrap Supabase calls in try/catch, show "Connection issue. Please check your internet" on network errors
- [x] T141 [P] [US8] Add success message auto-dismiss to all auth components: Use setTimeout to hide success messages after 5 seconds (already done for magic link in T047, apply to others)
- [x] T142 [US8] Create error handling documentation in libs/features/auth/README.md: Document error codes, user-friendly messages, loading state patterns

**Checkpoint**: All auth flows now have professional loading states and error handling.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories, documentation, and final validation

- [X] T143 [P] Export all components from libs/features/auth/src/index.ts: LoginComponent, RegistrationComponent, OnboardingComponent, UpgradePromptComponent, PasswordResetComponent, AuthCallbackComponent
- [X] T144 [P] Update libs/features/auth/README.md: Document all components, props, usage examples, integration with AuthService
- [X] T145 [P] Run linting on all auth feature files: npx nx lint features-auth, fix any errors
- [X] T146 [P] Run formatting on all auth feature files: npx nx format:write --projects=features-auth
- [X] T147 [P] Verify all auth components use inline Tailwind classes only: No separate CSS files (except existing styles if any)
- [X] T148 [P] Verify all auth components have ARIA labels: Run accessibility audit with axe-core or similar
- [X] T149 [P] Verify all auth components are keyboard navigable: Tab through all forms, verify logical tab order
- [X] T150 [P] Run all unit tests: npx nx test features-auth, verify 100% pass rate
- [X] T151 [P] Run all E2E tests: npx nx e2e web-e2e --spec=auth/\*\*, verify all scenarios pass
- [X] T152 Validate quickstart.md flows: Follow quickstart.md step-by-step, verify all 6 auth flows work as documented
- [X] T153 Update CLAUDE.md if needed: Add any new patterns or conventions discovered during implementation
- [X] T154 Create demo video or screenshots: Capture each auth flow for documentation purposes (optional)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-10)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P0 → P1 → P2 → P3)
- **Polish (Phase 11)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P0)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 3 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 4 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 5 (P2)**: Depends on US1 (anonymous mode) and US4 (registration) being complete
- **User Story 6 (P2)**: Can start after Foundational - No dependencies on other stories
- **User Story 7 (P3)**: Depends on US2 (login) being complete (needs "Forgot Password" link)
- **User Story 8 (P2)**: Should be implemented progressively across all stories as they're built

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Shared utilities (validators, types) before components
- Components before page wrappers
- Page wrappers before routes
- Routes before E2E tests

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002-T005)
- All Foundational tasks marked [P] can run in parallel (T007-T008)
- Once Foundational phase completes, US1-US4 can start in parallel (independent stories)
- US6 can be built in parallel with US1-US4
- All tests for a user story marked [P] can run in parallel
- Components marked [P] can run in parallel (different files)
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 2 (Email/Password Sign In)

```bash
# Launch all tests for User Story 2 together:
Task: "Unit test for login form validation in libs/features/auth/src/lib/components/login.spec.ts"
Task: "Unit test for loading state management in libs/features/auth/src/lib/components/login.spec.ts"
Task: "Integration test for email/password sign-in in libs/features/auth/src/lib/services/auth.spec.ts"
Task: "Integration test for invalid credentials in libs/features/auth/src/lib/services/auth.spec.ts"
Task: "E2E test for login flow in apps/web-e2e/src/auth/login.spec.ts"

# Launch all parallelizable implementation tasks together:
Task: "Implement reactive form in libs/features/auth/src/lib/components/login.ts"
Task: "Add inline validation error messages in libs/features/auth/src/lib/components/login.ts template"
Task: "Add loading state to submit button in libs/features/auth/src/lib/components/login.ts template"
Task: "Add ARIA attributes to form elements in libs/features/auth/src/lib/components/login.ts"
Task: "Style login form with DaisyUI classes in libs/features/auth/src/lib/components/login.ts template"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T010)
3. Complete Phase 3: User Story 1 - Anonymous Mode (T011-T022)
4. **STOP and VALIDATE**: Test anonymous mode independently
5. Deploy/demo if ready

**Deliverable**: Users can click "Continue as Guest" and use the app without authentication.

### Incremental Delivery

1. Complete Setup + Foundational (T001-T010) → Foundation ready
2. Add User Story 1 (T011-T022) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (T023-T036) → Test independently → Deploy/Demo
4. Add User Story 3 (T037-T055) → Test independently → Deploy/Demo
5. Add User Story 4 (T056-T079) → Test independently → Deploy/Demo
6. Add User Story 5 (T080-T094) → Test independently → Deploy/Demo
7. Add User Story 6 (T095-T110) → Test independently → Deploy/Demo
8. Add User Story 7 (T111-T131) → Test independently → Deploy/Demo
9. Add User Story 8 (T132-T142) → Validate all flows → Deploy/Demo
10. Complete Polish (T143-T154) → Final validation

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T010)
2. Once Foundational is done:
   - Developer A: User Story 1 (T011-T022)
   - Developer B: User Story 2 (T023-T036)
   - Developer C: User Story 3 (T037-T055)
   - Developer D: User Story 4 (T056-T079)
3. After P0/P1 stories complete:
   - Developer A: User Story 5 (T080-T094)
   - Developer B: User Story 6 (T095-T110)
   - Developer C: User Story 7 (T111-T131)
   - Developer D: User Story 8 (T132-T142)
4. Team completes Polish together (T143-T154)

Stories complete and integrate independently.

---

## Summary Statistics

**Total Tasks**: 154
**Setup Phase**: 5 tasks
**Foundational Phase**: 5 tasks
**User Story 1 (P0)**: 12 tasks (3 tests + 9 implementation)
**User Story 2 (P1)**: 14 tasks (5 tests + 9 implementation)
**User Story 3 (P1)**: 19 tasks (4 tests + 15 implementation)
**User Story 4 (P1)**: 24 tasks (6 tests + 18 implementation)
**User Story 5 (P2)**: 15 tasks (5 tests + 10 implementation)
**User Story 6 (P2)**: 12 tasks (4 tests + 8 implementation)
**User Story 7 (P3)**: 21 tasks (5 tests + 16 implementation)
**User Story 8 (P2)**: 11 tasks (4 tests + 7 implementation)
**Polish Phase**: 12 tasks

**Parallel Opportunities**: 78 tasks marked [P] can run in parallel within their phase
**Test Coverage**: 40 test tasks (26% of total tasks)
**MVP Scope**: Phase 1 + Phase 2 + Phase 3 = 22 tasks

---

## Notes

- [P] tasks = different files, no dependencies within the phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD approach)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All file paths are absolute from repository root
- DaisyUI styling is mandatory (btn, card, input, form-control, etc.)
- Inline Tailwind classes only (no separate CSS files)
- ARIA labels required for WCAG 2.1 AA compliance
- Signals preferred over RxJS where appropriate (Angular 20+)
- FormBuilder and reactive forms for all form handling
- AuthService integration points already exist and are stable
