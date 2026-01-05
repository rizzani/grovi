# Appwrite Authentication Setup Guide

This guide walks you through configuring Appwrite authentication for the Grovi app, including Phone OTP, Email Verification, and OAuth (Google/Facebook) across dev, staging, and production environments.

## Prerequisites

- Appwrite Cloud account or self-hosted Appwrite instance
- Access to Appwrite Console
- Google OAuth credentials (Client ID and Secret)
- Facebook OAuth credentials (App ID and App Secret)
- SMS provider configured in Appwrite (for Phone OTP)

## Step 1: Environment Variables Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Appwrite credentials in `.env`:
   ```env
   EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   EXPO_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_APPWRITE_PLATFORM=com.grovi.app
   EXPO_PUBLIC_OAUTH_REDIRECT_URL=grovi://
   ```

### Environment-Specific Values

#### Development
```env
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=dev-project-id
EXPO_PUBLIC_APPWRITE_PLATFORM=com.grovi.app.dev
EXPO_PUBLIC_OAUTH_REDIRECT_URL=exp://localhost:8081
```

#### Staging
```env
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=staging-project-id
EXPO_PUBLIC_APPWRITE_PLATFORM=com.grovi.app.staging
EXPO_PUBLIC_OAUTH_REDIRECT_URL=grovi://staging
```

#### Production
```env
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=prod-project-id
EXPO_PUBLIC_APPWRITE_PLATFORM=com.grovi.app
EXPO_PUBLIC_OAUTH_REDIRECT_URL=grovi://
```

## Step 2: Appwrite Console Configuration

### 2.1 Create/Select Project

1. Log in to [Appwrite Console](https://cloud.appwrite.io)
2. Create a new project or select an existing one
3. Note your **Project ID** (you'll need this for `.env`)

### 2.2 Enable Phone Authentication

1. Navigate to **Auth** → **Settings**
2. Enable **Phone** authentication method
3. Configure SMS provider:
   - Go to **Settings** → **SMS**
   - Select your SMS provider (Twilio, Vonage, etc.)
   - Enter provider credentials
   - **Important**: Verify that your SMS provider supports Jamaica (+1-876) phone numbers
4. Test SMS delivery:
   - Use a test phone number in format: `+18761234567`
   - Verify OTP is received successfully

### 2.3 Enable Email Authentication

1. Navigate to **Auth** → **Settings**
2. Enable **Email/Password** authentication method
3. Enable **Email Verification**:
   - Toggle "Require email verification" to ON
   - Configure verification email template (optional)
4. Configure email provider:
   - Go to **Settings** → **SMTP**
   - Enter SMTP credentials
   - Test email delivery

### 2.4 Configure OAuth Providers

#### Google OAuth Setup

1. **Create Google OAuth Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs:
     - `https://cloud.appwrite.io/v1/account/sessions/oauth2/callback/google/[PROJECT_ID]`
     - Add your production redirect URL if different
   - Save **Client ID** and **Client Secret**

2. **Configure in Appwrite**:
   - Navigate to **Auth** → **Settings** → **OAuth2**
   - Click **Add Provider** → **Google**
   - Enter:
     - **App ID**: Your Google Client ID
     - **App Secret**: Your Google Client Secret
   - Click **Update**

#### Facebook OAuth Setup

1. **Create Facebook App**:
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create a new app → **Consumer** type
   - Add **Facebook Login** product
   - Configure **Valid OAuth Redirect URIs**:
     - `https://cloud.appwrite.io/v1/account/sessions/oauth2/callback/facebook/[PROJECT_ID]`
   - Go to **Settings** → **Basic**
   - Save **App ID** and **App Secret**

2. **Configure in Appwrite**:
   - Navigate to **Auth** → **Settings** → **OAuth2**
   - Click **Add Provider** → **Facebook**
   - Enter:
     - **App ID**: Your Facebook App ID
     - **App Secret**: Your Facebook App Secret
   - Click **Update**

### 2.5 Configure OAuth Redirect URLs

For OAuth to work correctly, you need to configure redirect URLs in Appwrite:

1. Navigate to **Auth** → **Settings** → **Platforms**
2. Add the following redirect URLs:

   **Development:**
   - `exp://localhost:8081`
   - `exp://192.168.x.x:8081` (for physical device testing)

   **Staging:**
   - `grovi://staging`
   - `https://staging.grovi.app` (if web support needed)

   **Production:**
   - `grovi://`
   - `https://grovi.app` (if web support needed)

3. For each environment, ensure the redirect URL matches:
   - The `EXPO_PUBLIC_OAUTH_REDIRECT_URL` in your `.env` file
   - The URL scheme in `app.json` (`grovi://`)

## Step 3: Verify Configuration

### Test Phone Authentication

1. Use the `createPhoneSession` function with a Jamaican phone number:
   ```typescript
   await createPhoneSession('+18761234567');
   ```
2. Verify OTP is received via SMS
3. Use `verifyPhoneOTP` to complete authentication

### Test Email Authentication

1. Create an account:
   ```typescript
   await createEmailAccount('test@example.com', 'password123');
   ```
2. Send verification email:
   ```typescript
   await sendEmailVerification();
   ```
3. Verify email using the link/secret from email
4. Sign in:
   ```typescript
   await createEmailSession('test@example.com', 'password123');
   ```

### Test Google OAuth

1. Call `signInWithGoogle()` function
2. Browser/app should open for Google authentication
3. After successful authentication, you should be redirected back to the app
4. Verify session is created:
   ```typescript
   const session = await getCurrentSession();
   const user = await getCurrentUser();
   ```

### Test Facebook OAuth

1. Call `signInWithFacebook()` function
2. Browser/app should open for Facebook authentication
3. After successful authentication, you should be redirected back to the app
4. Verify session is created:
   ```typescript
   const session = await getCurrentSession();
   const user = await getCurrentUser();
   ```

## Step 4: Environment-Specific Setup

### Development Environment

- Use Appwrite Cloud or local development instance
- Redirect URL: `exp://localhost:8081`
- Test with development OAuth apps (if separate)

### Staging Environment

- Use separate Appwrite project for staging
- Redirect URL: `grovi://staging`
- Use staging OAuth apps

### Production Environment

- Use production Appwrite project
- Redirect URL: `grovi://`
- Use production OAuth apps
- Ensure all credentials are secure and not committed to git

## Troubleshooting

### Phone OTP Not Received

- Verify SMS provider is configured correctly
- Check that Jamaica (+1-876) is supported by your SMS provider
- Verify phone number format: `+18761234567` (E.164 format)
- Check Appwrite logs for SMS delivery errors

### Email Verification Not Working

- Verify SMTP credentials are correct
- Check spam folder for verification emails
- Verify email template is configured (if custom)
- Check Appwrite logs for email delivery errors

### OAuth Redirect Not Working

- Verify redirect URL in Appwrite matches `EXPO_PUBLIC_OAUTH_REDIRECT_URL`
- Verify redirect URL is added to OAuth provider (Google/Facebook) settings
- Check that URL scheme in `app.json` matches redirect URL
- For Expo dev: Use `exp://localhost:8081`
- For production: Use `grovi://`

### Session Not Created After OAuth

- Verify OAuth provider credentials are correct
- Check Appwrite logs for authentication errors
- Ensure redirect URL is exactly matching in all places
- Verify platform identifier is set correctly

## Security Notes

- Never commit `.env` file to version control
- Use different OAuth apps for dev/staging/production
- Rotate secrets regularly
- Use Appwrite API keys with minimal required permissions
- Enable rate limiting in Appwrite for production

## Additional Resources

- [Appwrite Authentication Documentation](https://appwrite.io/docs/authentication)
- [Appwrite OAuth Guide](https://appwrite.io/docs/authentication-oauth)
- [Expo Linking Documentation](https://docs.expo.dev/versions/latest/sdk/linking/)
- [EAS Build Configuration](https://docs.expo.dev/build/introduction/)



