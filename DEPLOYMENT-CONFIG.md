# Production Deployment Configuration Strategy

## Overview
This document outlines the configuration strategy for deploying the flashcard application to AWS EC2 with proper secret management and environment-specific settings.

## Configuration Approach

### 1. AWS Secrets Manager (Sensitive Data)
Store all sensitive credentials that should never be in code:
- `PIPECAT_API_KEY` - PipeCat API authentication
- `DAILY_API_KEY` - Daily.co API key (if used)
- Future: Database passwords, third-party API keys

**Access in AWS:**
```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name flashcard-app/production \
  --secret-string '{
    "PIPECAT_API_KEY": "sk_your-actual-key",
    "DAILY_API_KEY": "your-daily-key"
  }'

# Update existing secrets
aws secretsmanager update-secret \
  --secret-id flashcard-app/production \
  --secret-string '{"PIPECAT_API_KEY": "new-key"}'
```

### 2. Configuration Files (Non-Sensitive Settings)
YAML configuration files for environment-specific but non-sensitive settings:

**Files Created:**
- `config/production.yml` - Production environment settings
- `config/development.yml` - Local development settings
- `server/src/config.ts` - Configuration manager that loads both YAML and secrets

**Configuration Structure:**
```yaml
server:
  port: 8080  # Required for AWS ALB health checks
  node_env: production

cors:
  origin: "https://your-alb-url.elb.amazonaws.com"

pipecat:
  agent_name: "flashcard-voice-agent"
  webhook_url: "${ALB_URL}/webhook"  # Dynamically replaced

features:
  voice_mode: true
  practice_mode: true
  debug_mode: false
```

### 3. Environment Variable Overrides
Any configuration can be overridden via environment variables:
- `PORT=8080` overrides `server.port`
- `CORS_ORIGIN=https://example.com` overrides `cors.origin`
- `PIPECAT_AGENT_NAME=custom-agent` overrides `pipecat.agent_name`

## Implementation Files

### Required NPM Packages
Add to `server/package.json`:
```json
"dependencies": {
  "js-yaml": "^4.1.0",
  "@aws-sdk/client-secrets-manager": "^3.0.0",
  "@types/js-yaml": "^4.0.9"
}
```

### Updated Server Code
- `server/src/config.ts` - Configuration manager
- `server/src/server-updated.ts` - Updated server using config manager

### Deployment Scripts
- `scripts/start_application_v2.sh` - Updated startup script with proper configuration

## Deployment Steps

1. **Install dependencies locally:**
```bash
cd server
npm install js-yaml @aws-sdk/client-secrets-manager @types/js-yaml
```

2. **Update server.ts to use configuration:**
Replace current `server.ts` with `server-updated.ts` content

3. **Store secrets in AWS:**
```bash
aws secretsmanager create-secret \
  --name flashcard-app/production \
  --secret-string '{"PIPECAT_API_KEY": "your-actual-key"}'
```

4. **Update CodeDeploy scripts:**
Use `start_application_v2.sh` instead of the current start script

5. **Set EC2 IAM permissions:**
Attach policy to allow EC2 to read secrets:
```bash
aws iam attach-role-policy \
  --role-name flashcard-app-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
```

## Benefits

1. **Security**: Sensitive data never in code repository
2. **Flexibility**: Easy to change settings per environment
3. **Maintainability**: Clear separation of configuration types
4. **AWS Integration**: Native AWS Secrets Manager support
5. **Override Support**: Environment variables can override any setting
6. **Feature Flags**: Easy to enable/disable features per environment

## Next Steps

1. Commit the configuration files and updated server code
2. Update EC2 IAM role permissions for Secrets Manager
3. Store production secrets in AWS Secrets Manager
4. Deploy with new configuration system
5. Update ALB configuration once stable