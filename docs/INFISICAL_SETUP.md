# Infisical Secrets Management Setup

This guide explains how to set up and use Infisical for secure secrets management in the Recipe Planner application.

## Table of Contents

- [Overview](#overview)
- [Why Infisical?](#why-infisical)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Configuration](#configuration)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [Migration from Environment Variables](#migration-from-environment-variables)

## Overview

The application now supports Infisical for centralized secrets management. When configured, all sensitive configuration (API keys, database URLs, etc.) is fetched securely from Infisical instead of using local environment variables.

## Why Infisical?

- **Centralized Management**: Manage all secrets in one secure location
- **Environment Separation**: Separate secrets for dev, staging, and production
- **Team Collaboration**: Share secrets securely with your team
- **Audit Logging**: Track who accessed or modified secrets
- **Version Control**: Keep history of secret changes
- **Automatic Rotation**: Support for secret rotation
- **Fallback Support**: Automatically falls back to environment variables if Infisical is unavailable

## Prerequisites

1. An Infisical account (sign up at [https://infisical.com](https://infisical.com))
2. A project created in Infisical
3. Service tokens or Machine Identity credentials (Client ID and Secret)

## Setup Instructions

### Step 1: Create an Infisical Account

1. Visit [https://infisical.com](https://infisical.com)
2. Sign up for a free account
3. Verify your email

### Step 2: Create a Project

1. Log in to your Infisical dashboard
2. Click "New Project"
3. Name your project (e.g., "Recipe Planner")
4. Choose your plan (free tier is fine for development)

### Step 3: Set Up Environments

Infisical supports multiple environments. By default, you'll have:
- Development
- Staging
- Production

You can add secrets to each environment separately.

### Step 4: Create Machine Identity (Service Account)

1. Go to your project settings
2. Navigate to "Access Control" → "Machine Identities"
3. Click "Create Machine Identity"
4. Name it (e.g., "recipe-planner-backend")
5. Save the **Client ID** and **Client Secret** (you'll need these!)

⚠️ **Important**: Store these credentials securely. You won't be able to see the Client Secret again.

### Step 5: Add Secrets to Infisical

Add all your application secrets to Infisical. Here's the list of required secrets:

**Database Configuration:**
- `DATABASE_URL`

**Server Configuration:**
- `PORT`

**Firebase Configuration:**
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`

**OpenAI Configuration:**
- `OPENAI_API_KEY`
- `OPENAI_ORG_ID` (optional)

**AI Model Configuration:**
- `AI_MODEL_CHAT`
- `AI_MODEL_VISION`
- `AI_MODEL_EMBEDDING`

**AI Rate Limiting:**
- `AI_CHAT_RATE_LIMIT`
- `AI_VISION_RATE_LIMIT`
- `AI_CHAT_TOKEN_LIMIT`
- `AI_VISION_TOKEN_LIMIT`

**AI Feature Flags:**
- `AI_FEATURES_ENABLED`
- `AI_CACHE_ENABLED`
- `AI_CACHE_TTL`
- `AI_RETRY_ENABLED`
- `AI_LOGGING_ENABLED`

### Step 6: Configure Your Application

Create a `.env` file in your project root with your Infisical credentials:

```bash
# Infisical Configuration
INFISICAL_CLIENT_ID="your_client_id_here"
INFISICAL_CLIENT_SECRET="your_client_secret_here"
INFISICAL_PROJECT_ID="your_project_id_here"
INFISICAL_ENVIRONMENT="dev"
INFISICAL_SECRETS_PATH="/"
```

**Finding Your Project ID:**
1. Go to your project in Infisical
2. Click on "Settings"
3. Copy the "Project ID"

## Configuration

### Environment Variables

The application uses the following Infisical-specific environment variables:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `INFISICAL_CLIENT_ID` | Your machine identity client ID | Yes* | - |
| `INFISICAL_CLIENT_SECRET` | Your machine identity client secret | Yes* | - |
| `INFISICAL_PROJECT_ID` | Your Infisical project ID | Yes* | - |
| `INFISICAL_ENVIRONMENT` | Environment to fetch secrets from | No | `dev` |
| `INFISICAL_SECRETS_PATH` | Path within the environment | No | `/` |

\* Required only if you want to use Infisical. The application will fall back to environment variables if these are not set.

### Fallback Behavior

The application gracefully handles Infisical unavailability:

1. If Infisical credentials are not provided, it uses environment variables directly
2. If Infisical is configured but unavailable, it falls back to environment variables with a warning
3. Critical secrets (like `DATABASE_URL`) are always validated regardless of source

## Usage

### Development

For local development, you can choose either approach:

**Option 1: Use Infisical (Recommended)**
```bash
# Set up Infisical credentials in .env
INFISICAL_CLIENT_ID="..."
INFISICAL_CLIENT_SECRET="..."
INFISICAL_PROJECT_ID="..."
INFISICAL_ENVIRONMENT="dev"

# Start the server
bun run dev
```

**Option 2: Use Local Environment Variables**
```bash
# Don't set Infisical credentials
# Set secrets directly in .env
DATABASE_URL="..."
OPENAI_API_KEY="..."

# Start the server
bun run dev
```

### Production

For production deployments, always use Infisical:

```bash
# Set Infisical credentials as environment variables in your deployment platform
INFISICAL_CLIENT_ID="..."
INFISICAL_CLIENT_SECRET="..."
INFISICAL_PROJECT_ID="..."
INFISICAL_ENVIRONMENT="production"
```

### Verifying Configuration

When the server starts, check the logs:

```
[Secrets] Initializing Infisical client...
[Secrets] Infisical client initialized successfully
[Secrets] Fetching secrets from Infisical (project: xxx, env: dev, path: /)
[Secrets] Populated process.env with Infisical secrets
[Secrets] Secrets loaded successfully
🔐 Secrets loaded from: Infisical
```

## Troubleshooting

### Issue: "Failed to initialize Infisical client"

**Cause**: Invalid Client ID or Client Secret

**Solution**:
1. Verify your credentials in Infisical dashboard
2. Create a new machine identity if needed
3. Update your `.env` file

### Issue: "Failed to fetch secrets from Infisical"

**Possible Causes**:
- Invalid Project ID
- Network connectivity issues
- Insufficient permissions

**Solutions**:
1. Verify your Project ID in Infisical settings
2. Check your internet connection
3. Ensure the machine identity has access to the project
4. Check Infisical status page

### Issue: "Missing required secrets: DATABASE_URL"

**Cause**: Secret not added to Infisical

**Solution**:
1. Go to your Infisical project
2. Select the correct environment
3. Add the missing secret
4. Restart your application

### Issue: Secrets not updating

**Cause**: Secrets are cached in the application

**Solution**:
Restart your application to fetch fresh secrets from Infisical

## Migration from Environment Variables

If you're currently using environment variables and want to migrate to Infisical:

### Step 1: Export Current Secrets

List all your current environment variables:

```bash
cat .env | grep -v '^#' | grep -v '^$'
```

### Step 2: Import to Infisical

For each secret in your `.env` file:
1. Open Infisical dashboard
2. Select your environment
3. Click "Add Secret"
4. Enter the key and value
5. Save

**Bulk Import (Optional)**:
- Infisical supports JSON import
- Export your secrets to JSON format
- Use Infisical CLI or API for bulk import

### Step 3: Update Your .env File

Replace your secrets with Infisical configuration:

```bash
# Before
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."

# After
INFISICAL_CLIENT_ID="..."
INFISICAL_CLIENT_SECRET="..."
INFISICAL_PROJECT_ID="..."
INFISICAL_ENVIRONMENT="dev"
```

### Step 4: Test

Start your application and verify:
1. Check logs for "Secrets loaded from: Infisical"
2. Verify application functionality
3. Test all features that use secrets

### Step 5: Remove Old Secrets

Once verified, you can safely remove old secrets from your `.env` file. Keep only:
- Infisical configuration
- Non-sensitive environment-specific settings

## Security Best Practices

1. **Never commit Infisical credentials**: Add `.env` to `.gitignore`
2. **Use different machine identities**: Create separate identities for dev, staging, and production
3. **Rotate credentials regularly**: Periodically update your Client Secret
4. **Limit access**: Only grant access to team members who need it
5. **Use environment separation**: Keep production secrets separate from development
6. **Enable audit logging**: Monitor who accesses your secrets
7. **Set up alerts**: Configure Infisical to alert on suspicious activity

## Additional Resources

- [Infisical Documentation](https://infisical.com/docs)
- [Infisical SDK Documentation](https://infisical.com/docs/sdks/languages/node)
- [Best Practices for Secrets Management](https://infisical.com/docs/getting-started/best-practices)

## Support

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review Infisical logs in the dashboard
3. Check application logs for detailed error messages
4. Contact your team's DevOps or security team
5. Reach out to Infisical support
