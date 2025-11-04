# Feature Specification: Authentication UI Components

**Feature Branch**: `002-auth-ui`
**Created**: 2025-01-03
**Status**: Draft
**Input**: User description: "Build complete authentication UI components including login, onboarding, password reset flows with DaisyUI and Angular signals"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Start with Anonymous Mode (Priority: P0)

A new user visits the Blastoise app for the first time and wants to try it immediately without creating an account. They see a clear, welcoming landing page that explains the app's benefits and offers a "Continue as Guest" option prominently displayed alongside sign-in options.

**Why this priority**: This is the critical path for user acquisition. Most users want to try an app before committing to an account. Providing instant access via anonymous mode reduces friction and increases conversion rates. This story can stand alone as a complete MVP.

**Independent Test**: Can be fully tested by opening the app without authentication and clicking "Continue as Guest". User should immediately access the app's core features with location tracking and local visit storage enabled. Success is measured by whether the user can track at least one visit without any authentication.

**Acceptance Scenarios**:

1. **Given** I am a first-time visitor, **When** I open the app, **Then** I see a landing page with app benefits, "Sign In" and "Continue as Guest" buttons
2. **Given** I am on the landing page, **When** I click "Continue as Guest", **Then** I am immediately taken to the main app interface with location permissions requested
3. **Given** I chose anonymous mode, **When** I track visits, **Then** my visits are stored locally in IndexedDB without requiring authentication
4. **Given** I am using anonymous mode, **When** I close and reopen the app, **Then** my local visits persist and I remain in anonymous mode

---

### User Story 2 - Email/Password Sign In (Priority: P1)

An existing user wants to sign into their Blastoise account to sync visits across devices. They navigate to the login page, enter their email and password, and are authenticated into their account with all their synced visits visible.

**Why this priority**: Essential for returning users and the foundation for multi-device support. Cannot sync data without authentication. This builds on P0 by adding account-based features while allowing P0 anonymous users to continue using the app.

**Independent Test**: Can be fully tested by creating a test account, signing out, then signing back in with email/password. Success criteria: user sees their synced visits after login and can access account-specific features.

**Acceptance Scenarios**:

1. **Given** I have an existing account, **When** I click "Sign In" on the landing page, **Then** I see a login form with email and password fields
2. **Given** I am on the login form, **When** I enter valid credentials and submit, **Then** I am authenticated and redirected to my visit timeline
3. **Given** I entered invalid credentials, **When** I submit the login form, **Then** I see a clear error message explaining the issue (e.g., "Invalid email or password")
4. **Given** I am signed in, **When** I refresh the browser, **Then** I remain authenticated and see my data
5. **Given** I am signed in, **When** I click "Sign Out" in settings, **Then** I am logged out and redirected to the landing page

---

### User Story 3 - Magic Link Authentication (Priority: P1)

A user prefers passwordless authentication for convenience and security. They enter their email address, request a magic link, receive an email, and click the link to authenticate without typing a password.

**Why this priority**: Improves security (no passwords to leak), reduces friction (no password to remember), and provides a modern authentication option. This is complementary to P1 email/password auth and can be tested independently.

**Independent Test**: Can be fully tested by requesting a magic link to a test email address, clicking the link, and verifying successful authentication. Success: user is authenticated without ever entering a password.

**Acceptance Scenarios**:

1. **Given** I am on the login page, **When** I click "Sign in with magic link" tab, **Then** I see a form with only an email field and a "Send Magic Link" button
2. **Given** I entered a valid email, **When** I click "Send Magic Link", **Then** I see a success message: "Check your email for a sign-in link"
3. **Given** I received the magic link email, **When** I click the link, **Then** I am authenticated and redirected to the app
4. **Given** I clicked an expired magic link (>24 hours old), **When** the app processes it, **Then** I see an error message prompting me to request a new link

---

### User Story 4 - New Account Registration (Priority: P1)

A new user wants to create a Blastoise account to access cloud sync and multi-device support. They fill out a registration form with email and password, agree to terms, and create their account.

**Why this priority**: Required for user growth and cloud-synced features. Works alongside P0 anonymous mode by providing an upgrade path. Can be tested independently of existing sign-in flows.

**Independent Test**: Can be fully tested by completing the sign-up form with a new email address. Success: account is created in Supabase, user receives confirmation email, and is authenticated immediately.

**Acceptance Scenarios**:

1. **Given** I am on the landing page, **When** I click "Create Account" or "Sign Up", **Then** I see a registration form with email, password, and confirm password fields
2. **Given** I fill out the registration form with valid data, **When** I submit, **Then** my account is created and I am authenticated immediately
3. **Given** I enter a password that doesn't meet requirements, **When** I submit, **Then** I see validation errors explaining password requirements (min 8 chars, etc.)
4. **Given** I enter an email that's already registered, **When** I submit, **Then** I see a message: "This email is already registered. Try signing in instead." with a link to the login page
5. **Given** I successfully register, **When** account is created, **Then** I receive a welcome email with app tips and confirmation

---

### User Story 5 - Anonymous to Authenticated Upgrade (Priority: P2)

An anonymous user has been tracking visits locally and now wants to create an account to sync their data across devices. They access an upgrade prompt, enter their email and password, and their local visits are migrated to their new cloud account.

**Why this priority**: Critical conversion path for engaged users. Captures value from users who started anonymously and now want full features. Depends on P0 (anonymous mode) and P1 (registration) but can be tested independently once those are complete.

**Independent Test**: Can be fully tested by using anonymous mode to create test visits, then upgrading to an account and verifying that local visits sync to the cloud. Success: all local data is preserved and now accessible across devices.

**Acceptance Scenarios**:

1. **Given** I am using anonymous mode with saved visits, **When** I navigate to settings, **Then** I see a prominent "Upgrade to Account" button with benefits listed (sync across devices, cloud backup, etc.)
2. **Given** I click "Upgrade to Account", **When** the upgrade form appears, **Then** I see email and password fields with a message: "Your local visits will be preserved and synced to the cloud"
3. **Given** I complete the upgrade form, **When** I submit, **Then** my account is created, local visits are migrated to cloud storage, and I am authenticated
4. **Given** I upgraded my account, **When** I sign in on a new device, **Then** I see all my previously-local visits synced from the cloud

---

### User Story 6 - Onboarding Flow for First-Time Users (Priority: P2)

A new user opening the app for the first time is guided through a brief onboarding wizard that explains location permissions, privacy controls, and key app features. The onboarding is skippable and informative without being overwhelming.

**Why this priority**: Improves user understanding and permission grant rates. Not blocking for core functionality (can skip) but significantly improves user experience and reduces confusion. Can be tested independently as an optional first-run experience.

**Independent Test**: Can be fully tested by clearing app data and opening the app as a new user. Success: onboarding shows key screens, educates about permissions, and smoothly transitions to app usage (anonymous or authenticated).

**Acceptance Scenarios**:

1. **Given** I am a first-time user, **When** I open the app for the first time, **Then** I see an onboarding wizard starting with a welcome screen explaining Blastoise's purpose
2. **Given** I am in the onboarding wizard, **When** I progress through screens, **Then** I see 3-4 brief screens covering: location permissions, privacy approach, key features, and authentication options
3. **Given** I am on any onboarding screen, **When** I click "Skip", **Then** I am taken directly to the app with anonymous mode enabled
4. **Given** I complete the onboarding, **When** I reach the final screen, **Then** I see both "Sign In" and "Continue as Guest" options
5. **Given** I completed onboarding once, **When** I return to the app later, **Then** onboarding does not show again (stored in localStorage)

---

### User Story 7 - Password Reset Flow (Priority: P3)

A user forgot their password and needs to reset it. They click "Forgot Password" on the login page, enter their email, receive a reset link, and create a new password to regain access to their account.

**Why this priority**: Required for account recovery but lower priority than initial auth flows. Most users won't need this immediately. Can be tested independently once P1 email/password auth exists.

**Independent Test**: Can be fully tested by triggering "Forgot Password", receiving the email, clicking the reset link, setting a new password, and signing in with the new credentials. Success: user regains account access.

**Acceptance Scenarios**:

1. **Given** I am on the login page, **When** I click "Forgot Password?", **Then** I see a password reset form asking for my email address
2. **Given** I enter my email and submit, **When** the request processes, **Then** I see a message: "Check your email for a password reset link"
3. **Given** I receive the reset email, **When** I click the reset link, **Then** I am taken to a page where I can enter a new password
4. **Given** I enter a valid new password, **When** I submit the reset form, **Then** my password is updated and I am automatically signed in
5. **Given** I clicked an expired reset link (>1 hour old), **When** I try to use it, **Then** I see an error prompting me to request a new reset link

---

### User Story 8 - Loading States and Error Handling (Priority: P2)

During authentication operations (sign in, sign up, password reset), users see appropriate loading indicators and clear error messages if something goes wrong. Errors are user-friendly and actionable.

**Why this priority**: Essential for professional UX but not blocking core functionality. Improves perceived performance and reduces user confusion. Can be implemented progressively across all auth flows.

**Independent Test**: Can be tested by simulating slow networks, invalid inputs, and error conditions for each auth operation. Success: every auth operation shows loading state and handles errors gracefully.

**Acceptance Scenarios**:

1. **Given** I submit any auth form (login, signup, reset), **When** the request is processing, **Then** I see a loading spinner and the submit button is disabled
2. **Given** a network error occurs during auth, **When** the error is detected, **Then** I see a user-friendly message: "Connection issue. Please check your internet and try again."
3. **Given** Supabase returns a specific error (e.g., "User not found"), **When** displayed to user, **Then** the message is clear and actionable: "No account found with this email. Try creating an account."
4. **Given** I am on the loading state, **When** the operation completes (success or error), **Then** the loading indicator disappears and I see the result

---

### Edge Cases

- **What happens when a user is authenticated but Supabase session expires?**
  The app should detect the expired session on next API call, sign the user out gracefully, and redirect to the login page with a message: "Your session expired. Please sign in again."

- **What happens when a user closes the browser during the magic link flow?**
  Magic links should work across browser sessions. If the user clicks the link in a different browser or after closing, they should still authenticate successfully (as long as link hasn't expired).

- **What happens when network is offline during authentication?**
  The app should detect offline state and show an appropriate error message: "No internet connection. Authentication requires an internet connection." The user can retry once back online.

- **What happens when a user tries to register with an email already in use?**
  Show clear error: "This email is already registered. Try signing in instead." Include a link directly to the login form.

- **What happens when a user rapidly clicks submit on auth forms?**
  Form submissions should be debounced or disabled after first submit to prevent duplicate requests. Show loading state immediately on first click.

- **What happens when localStorage is disabled or full?**
  Anonymous mode won't work properly. Show a warning message: "Anonymous mode requires browser storage. Please enable cookies and site data, then refresh the page."

- **What happens when a user has both anonymous visits and signs into an account with existing cloud visits?**
  System should prompt user: "You have X local visits. Merge with your account visits or discard local visits?" Provide clear options for both scenarios.

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication Forms

- **FR-001**: System MUST provide a login page with email/password form, magic link option tab, and "Continue as Guest" button
- **FR-002**: System MUST validate email format and password strength in real-time with clear error messages
- **FR-003**: System MUST display loading indicators during all authentication operations and disable form inputs while processing
- **FR-004**: System MUST show user-friendly error messages for all auth failures (network errors, invalid credentials, validation errors)
- **FR-005**: System MUST provide a registration form with email, password, and password confirmation fields
- **FR-006**: System MUST enforce password requirements: minimum 8 characters, at least one letter and one number
- **FR-007**: System MUST include a "Forgot Password?" link on the login page that navigates to password reset flow
- **FR-008**: System MUST support magic link authentication with email-only form and clear status messages
- **FR-009**: System MUST provide password reset form accessible via email link with new password input and confirmation

#### Anonymous Mode

- **FR-010**: System MUST enable anonymous mode when user clicks "Continue as Guest" without requiring any input
- **FR-011**: System MUST persist anonymous mode choice in localStorage so users remain anonymous across sessions
- **FR-012**: System MUST display an upgrade prompt in settings when user is in anonymous mode
- **FR-013**: System MUST provide an upgrade flow that converts anonymous users to authenticated accounts while preserving local data

#### Onboarding

- **FR-014**: System MUST show an onboarding wizard on first app launch for new users
- **FR-015**: Onboarding MUST include 3-4 screens explaining: app purpose, location permissions, privacy approach, and authentication options
- **FR-016**: System MUST allow users to skip onboarding at any point via a visible "Skip" button
- **FR-017**: System MUST track onboarding completion in localStorage to prevent showing it again
- **FR-018**: Final onboarding screen MUST provide both "Sign In" and "Continue as Guest" options

#### Session Management

- **FR-019**: System MUST maintain authenticated sessions across browser refreshes using Supabase session management
- **FR-020**: System MUST detect session expiration and redirect users to login with appropriate message
- **FR-021**: System MUST provide a "Sign Out" option that clears session and redirects to landing page
- **FR-022**: System MUST sync auth state across browser tabs using Supabase auth state change events

#### UI/UX Requirements

- **FR-023**: All forms MUST use DaisyUI components for consistent styling across the app
- **FR-024**: All styling MUST use inline Tailwind CSS classes (no separate CSS files except for custom animations)
- **FR-025**: All forms MUST be fully keyboard navigable with proper tab order and Enter key submit
- **FR-026**: All interactive elements MUST have appropriate ARIA labels and roles for screen readers
- **FR-027**: Forms MUST display validation errors inline next to relevant fields
- **FR-028**: Auth pages MUST be responsive and work on mobile screens (320px+), tablets, and desktops
- **FR-029**: Success messages (e.g., "Magic link sent") MUST auto-dismiss after 5 seconds or be dismissible by user

#### Integration Requirements

- **FR-030**: All auth components MUST integrate with existing `AuthService` at `libs/features/auth/src/lib/services/auth.ts`
- **FR-031**: All auth components MUST use Angular signals for reactive state management
- **FR-032**: Auth components MUST call appropriate AuthService methods: `signInWithPassword()`, `signInWithMagicLink()`, `signUp()`, `enableAnonymousMode()`, `upgradeToAuthenticated()`
- **FR-033**: Auth guards MUST protect routes that require authentication using existing auth state
- **FR-034**: Unauthenticated users accessing protected routes MUST be redirected to login page with return URL preserved

### Key Entities

- **LoginForm**: Captures user email and password for authentication, includes toggle for magic link mode, validates input format and displays errors
- **RegistrationForm**: Captures email, password, password confirmation for new account creation, validates password strength and email uniqueness
- **PasswordResetForm**: Captures email for reset request and new password for reset completion, validates password requirements
- **UpgradePrompt**: Displays benefits of account upgrade to anonymous users, captures email/password for upgrade, handles local data migration
- **OnboardingWizard**: Multi-screen flow with 3-4 informational screens, tracks completion state, provides skip and navigation controls
- **AuthStateIndicator**: Visual component showing current auth status (authenticated, anonymous, loading), provides access to sign out or upgrade options

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New users can start using the app anonymously in under 10 seconds from first visit (one click on "Continue as Guest")
- **SC-002**: Existing users can sign into their account in under 30 seconds (email/password or magic link)
- **SC-003**: 90% of users successfully complete authentication flows on first attempt without errors or confusion
- **SC-004**: Password reset flow completion time is under 2 minutes from "Forgot Password" click to successful sign-in with new password
- **SC-005**: Anonymous-to-authenticated upgrade preserves 100% of local visit data with zero data loss
- **SC-006**: All authentication forms are keyboard navigable and screen-reader accessible (WCAG 2.1 AA compliant)
- **SC-007**: Auth forms display validation errors within 100ms of user input for immediate feedback
- **SC-008**: Loading states appear within 50ms of form submission for responsive feel
- **SC-009**: Anonymous mode adoption rate is at least 40% of first-time visitors (indicates successful onboarding and low friction)
- **SC-010**: Error messages are clear enough that support tickets related to auth issues decrease by 60% compared to baseline

## Assumptions

1. **Supabase Configuration**: Assumes Supabase project is already configured with email/password and magic link authentication enabled
2. **Email Delivery**: Assumes email service (Supabase email) is configured and reliable for magic link and password reset emails
3. **Browser Support**: Assumes modern browsers with ES6+ support, localStorage, and IndexedDB availability
4. **Existing Auth Service**: Assumes the `AuthService` at `libs/features/auth/src/lib/services/auth.ts` is fully functional and tested (as it appears to be)
5. **Migration Logic**: Data migration during anonymous upgrade will leverage existing visit sync infrastructure (IndexedDB to Supabase)
6. **Password Requirements**: 8+ characters with at least one letter and number is sufficient security for initial implementation (can be enhanced later with complexity rules)
7. **Session Duration**: Supabase default session duration (1 hour idle, 24 hours absolute) is acceptable without custom configuration
8. **Styling System**: DaisyUI components with Tailwind inline classes is the established pattern throughout the codebase
9. **No Social OAuth**: Initial implementation focuses on email-based auth only (Google/Apple OAuth is future enhancement)
10. **Single Device Anonymous**: Anonymous mode is device-specific (no cross-device sync for anonymous users)

## Dependencies

- **Existing Auth Service**: `libs/features/auth/src/lib/services/auth.ts` must remain stable during UI implementation
- **AuthStateService**: `libs/shared/auth-state` provides reactive auth state signals
- **Supabase Configuration**: Requires active Supabase project with auth enabled
- **Email Templates**: Supabase email templates for magic link and password reset must be configured
- **DaisyUI**: Requires DaisyUI installed and configured in Tailwind config
- **Routing**: Angular router must be configured with auth guard support
- **Visit Sync Service**: Anonymous upgrade depends on visit sync logic for data migration

## Out of Scope

- Social authentication (Google, Apple, Facebook OAuth) - future enhancement
- Two-factor authentication (2FA) - future enhancement
- Account deletion or data export - separate feature
- Admin user management - separate feature
- Password strength meter visual indicator - nice-to-have enhancement
- Remember me / persistent sessions beyond Supabase defaults - future enhancement
- Phone number authentication - future enhancement
- Custom email branding beyond Supabase defaults - future enhancement
- Biometric authentication (fingerprint, Face ID) - mobile-specific future enhancement

## Notes

- All components should follow the established Angular standalone component pattern used throughout the codebase
- Error handling should be consistent with the project's error handling strategy (user-friendly messages, no stack traces exposed)
- Loading states should use DaisyUI spinner components for visual consistency
- Form validation should use Angular reactive forms for type safety and testability
- All auth flows should support both web (apps/web) and mobile (apps/mobile) with shared components from libs/features/auth
- Accessibility is a first-class concern - all forms must be ARIA-compliant from the start, not retrofitted later
