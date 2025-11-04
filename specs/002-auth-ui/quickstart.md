# Quick Start: Authentication UI Components

**Feature**: 002-auth-ui
**Estimated Setup Time**: 15 minutes
**Prerequisites**: Blastoise project cloned, Node.js 22 LTS installed, Supabase project configured

## Overview

This guide helps you set up and test the authentication UI components locally. You'll be able to test login, registration, onboarding, and anonymous mode flows in under 15 minutes.

---

## Step 1: Environment Setup (2 minutes)

### 1.1 Verify Prerequisites

```bash
# Check Node.js version (should be 22.x)
node --version

# Check if in project root
pwd
# Expected: /path/to/Blastoise

# Check if dependencies are installed
ls node_modules/@angular/core
# If missing, run: npm install
```

### 1.2 Verify Supabase Configuration

```bash
# Check if Supabase environment variables exist
cat apps/web/.env | grep SUPABASE_URL
# Should show: SUPABASE_URL=https://your-project.supabase.co

cat apps/web/.env | grep SUPABASE_ANON_KEY
# Should show: SUPABASE_ANON_KEY=your-anon-key
```

**If missing**: Copy `.env.example` to `.env` and fill in Supabase credentials:

```bash
cp apps/web/.env.example apps/web/.env
# Edit apps/web/.env and add your Supabase URL and anon key
```

---

## Step 2: Start Development Server (1 minute)

### 2.1 Start Web Application

```bash
# Start the web development server
npx nx serve web

# Expected output:
# ✔ Browser application bundle generation complete.
# Initial chunk files | Names | Size
# ...
# ** Angular Live Development Server is listening on localhost:4200 **
```

### 2.2 Verify Server Running

Open your browser to [http://localhost:4200](http://localhost:4200)

You should see the Blastoise app homepage.

---

## Step 3: Test Authentication Flows (10 minutes)

### 3.1 Test Anonymous Mode (1 minute)

1. Open [http://localhost:4200](http://localhost:4200)
2. You should see the onboarding wizard (first-time users)
3. Click through the onboarding screens (or click "Skip")
4. On the final screen, click **"Continue as Guest"**
5. You should be redirected to the main app
6. Open browser DevTools → Application → Local Storage → `http://localhost:4200`
7. Verify these keys exist:
   - `anonymous_mode` = `"true"`
   - `anonymous_user_id` = `"anon_{some-uuid}"`
   - `onboarding_complete` = `"true"`

**Expected Result**: You can now use the app without authentication. Visits are stored locally in IndexedDB.

---

### 3.2 Test Email/Password Registration (2 minutes)

1. Open [http://localhost:4200/auth/register](http://localhost:4200/auth/register)
2. Enter a test email: `test-{timestamp}@example.com` (use unique email each time)
3. Enter password: `Test1234` (meets requirements: 8+ chars, letter + number)
4. Re-enter password: `Test1234`
5. Check "I agree to the terms of service"
6. Click **"Create Account"**
7. You should see a loading spinner briefly
8. Check your email inbox for confirmation email from Supabase
9. You should be redirected to the main app as authenticated user

**Expected Result**: Account created, user authenticated, localStorage shows `anonymous_mode` = `"false"`.

---

### 3.3 Test Email/Password Sign In (1 minute)

1. Open browser DevTools → Application → Local Storage
2. Clear all local storage (to simulate new session)
3. Refresh the page - you should be signed out
4. Navigate to [http://localhost:4200/auth/login](http://localhost:4200/auth/login)
5. Enter the email/password from Step 3.2
6. Click **"Sign In"**
7. You should see a loading spinner briefly
8. You should be redirected to the main app as authenticated user

**Expected Result**: Successfully signed in with existing credentials.

---

### 3.4 Test Magic Link Authentication (3 minutes)

1. Sign out from the app (Settings → Sign Out)
2. Navigate to [http://localhost:4200/auth/login](http://localhost:4200/auth/login)
3. Click the **"Sign in with Magic Link"** tab
4. Enter your test email from Step 3.2
5. Click **"Send Magic Link"**
6. You should see: "Check your email for a sign-in link"
7. Check your email inbox
8. Click the magic link in the email
9. You should be redirected to [http://localhost:4200/auth/callback](http://localhost:4200/auth/callback)
10. The callback page should briefly show "Signing you in..."
11. You should be redirected to the main app as authenticated user

**Expected Result**: Passwordless authentication successful.

---

### 3.5 Test Password Reset Flow (2 minutes)

1. Sign out from the app
2. Navigate to [http://localhost:4200/auth/login](http://localhost:4200/auth/login)
3. Click **"Forgot Password?"**
4. Enter your test email
5. Click **"Send Reset Link"**
6. You should see: "Check your email for a password reset link"
7. Check your email inbox
8. Click the reset link in the email
9. You should be redirected to [http://localhost:4200/auth/reset-password](http://localhost:4200/auth/reset-password)
10. Enter new password: `NewPass123` (meets requirements)
11. Re-enter password: `NewPass123`
12. Click **"Reset Password"**
13. You should be redirected to the main app as authenticated user

**Expected Result**: Password reset successful, signed in with new password.

---

### 3.6 Test Account Upgrade Flow (1 minute)

1. Clear all local storage and IndexedDB (DevTools → Application → Clear storage)
2. Open [http://localhost:4200](http://localhost:4200)
3. Click "Continue as Guest" to enter anonymous mode
4. Create a test visit (visit a nearby brewery/winery to trigger geofence)
   - **Note**: If no actual visits, you can manually create one via DevTools console:
   ```javascript
   // In browser console:
   localStorage.setItem('test_visit', JSON.stringify({ venue_id: 'test', arrived_at: new Date().toISOString() }));
   ```
5. Navigate to Settings
6. You should see an **"Upgrade to Account"** button with visit count
7. Click **"Upgrade to Account"**
8. Enter email and password for new account
9. Click **"Upgrade Account"**
10. You should see migration progress indicator
11. After completion, you're authenticated and your local visits are synced

**Expected Result**: Anonymous user upgraded to authenticated, local data migrated.

---

## Step 4: Test Form Validation (2 minutes)

### 4.1 Test Email Validation

1. Navigate to [http://localhost:4200/auth/login](http://localhost:4200/auth/login)
2. Enter invalid email: `notanemail`
3. Click into password field (trigger blur validation)
4. You should see: "Please enter a valid email address" in red below email field

### 4.2 Test Password Strength Validation

1. Navigate to [http://localhost:4200/auth/register](http://localhost:4200/auth/register)
2. Enter password: `short` (too short)
3. Click into another field
4. You should see password requirements checklist:
   - ❌ At least 8 characters (red)
   - ✓ At least one letter (green)
   - ❌ At least one number (red)
5. Update password to: `LongerPassword123`
6. All checkmarks should turn green ✓
7. Submit button should be enabled

### 4.3 Test Confirm Password Match

1. Still on registration page
2. Password: `Test1234`
3. Confirm Password: `Test12345` (different)
4. Click into another field
5. You should see: "Passwords do not match" in red below confirm password field

---

## Step 5: Test Accessibility (Optional, 3 minutes)

### 5.1 Test Keyboard Navigation

1. Navigate to [http://localhost:4200/auth/login](http://localhost:4200/auth/login)
2. Press `Tab` key repeatedly
3. Focus should move through: Email field → Password field → "Forgot Password?" link → "Sign In" button → "Magic Link" tab → "Continue as Guest" button
4. Press `Shift + Tab` to navigate backwards
5. Press `Enter` on any focused button to activate it

### 5.2 Test Screen Reader (if available)

**macOS VoiceOver**:
1. Press `Cmd + F5` to enable VoiceOver
2. Navigate to [http://localhost:4200/auth/login](http://localhost:4200/auth/login)
3. VoiceOver should announce: "Sign In, heading level 2"
4. Navigate to email field - VoiceOver should announce: "Email, required, edit text"
5. Enter invalid email and blur - VoiceOver should announce: "Invalid email address, alert"

**Expected Result**: All form fields are keyboard accessible and screen reader announces labels, errors, and states.

---

## Step 6: Test Mobile View (Optional, 2 minutes)

### 6.1 Responsive Design Test

1. Open browser DevTools (F12)
2. Click **"Toggle Device Toolbar"** icon (or press `Ctrl+Shift+M` / `Cmd+Shift+M`)
3. Select device: **iPhone 14 Pro** (or any mobile viewport)
4. Navigate to [http://localhost:4200/auth/login](http://localhost:4200/auth/login)
5. Verify:
   - Form is readable (text not too small)
   - Inputs are full width and touch-friendly
   - Buttons are large enough for touch (min 44px height)
   - No horizontal scrolling
   - Card is centered and doesn't overflow

### 6.2 Test on Real Mobile Device (if available)

1. Find your computer's local IP address:
   ```bash
   # macOS/Linux:
   ifconfig | grep inet

   # Windows:
   ipconfig
   ```
2. On your mobile device, open browser to: `http://{your-ip}:4200`
3. Test login flow on mobile device
4. Verify touch interactions work smoothly

**Expected Result**: Auth UI is fully responsive and touch-friendly.

---

## Troubleshooting

### Issue: "Cannot connect to Supabase"

**Solution**: Verify Supabase environment variables:
```bash
cat apps/web/.env | grep SUPABASE
```
Ensure URL and anon key are correct. Restart dev server after changing `.env`.

### Issue: "Email not sent" (magic link or password reset)

**Solution**: Check Supabase email settings:
1. Open Supabase dashboard
2. Go to Authentication → Email Templates
3. Verify email templates are enabled
4. Check spam folder for emails
5. For local development, check Supabase logs for email delivery errors

### Issue: "Form validation not working"

**Solution**: Check browser console for errors:
```bash
# Open DevTools → Console
# Look for Angular form errors
```
Ensure reactive forms module is imported in component.

### Issue: "Anonymous mode not persisting"

**Solution**: Verify localStorage is enabled:
```javascript
// In browser console:
localStorage.setItem('test', '123');
localStorage.getItem('test'); // Should return '123'
```
If not working, check browser privacy settings (localStorage might be disabled).

### Issue: "Onboarding shows every time"

**Solution**: Clear localStorage flag:
```javascript
// In browser console:
localStorage.removeItem('onboarding_complete');
```
Then refresh page. Onboarding should show once, then not again.

---

## Next Steps

After completing this quickstart, you should be able to:

1. ✅ Sign in with email/password
2. ✅ Sign in with magic link
3. ✅ Create new account
4. ✅ Reset forgotten password
5. ✅ Use anonymous mode
6. ✅ Upgrade from anonymous to authenticated
7. ✅ Navigate forms with keyboard
8. ✅ See validation errors in real-time

**Ready to implement tasks?** Run:

```bash
/speckit.tasks
```

This will generate the task breakdown for implementing the authentication UI components.

---

## Additional Resources

- **Specification**: [spec.md](./spec.md) - Full feature requirements
- **Research**: [research.md](./research.md) - Technical decisions and patterns
- **Data Model**: [data-model.md](./data-model.md) - TypeScript interfaces and state management
- **Supabase Docs**: https://supabase.com/docs/guides/auth
- **Angular Reactive Forms**: https://angular.io/guide/reactive-forms
- **DaisyUI Components**: https://daisyui.com/components/

---

## Developer Notes

### Component Locations

- **Login**: `libs/features/auth/src/lib/components/login.ts`
- **Registration**: `libs/features/auth/src/lib/components/registration.ts` (to be created)
- **Onboarding**: `libs/features/auth/src/lib/components/onboarding.ts`
- **Upgrade Prompt**: `libs/features/auth/src/lib/components/upgrade-prompt.ts`
- **Password Reset**: `libs/features/auth/src/lib/components/password-reset.ts` (to be created)
- **Auth Callback**: `libs/features/auth/src/lib/components/auth-callback.ts` (to be created)

### Service Integration

All components use the existing `AuthService` at:
- `libs/features/auth/src/lib/services/auth.ts`

No backend changes required. All Supabase auth methods already implemented.

### Testing Commands

```bash
# Run unit tests for auth feature
npx nx test features-auth

# Run E2E tests for auth flows
npx nx e2e web-e2e --spec=auth/**

# Watch mode (auto-rerun tests on file changes)
npx nx test features-auth --watch
```

---

**Questions?** Check the [spec.md](./spec.md) for detailed requirements or [research.md](./research.md) for technical patterns.
