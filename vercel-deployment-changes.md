# Vercel Deployment Changes Required

## Environment Variables Setup

### Frontend (.env.production)
```
REACT_APP_WS_URL=wss://your-backend-domain.com
REACT_APP_API_URL=https://your-backend-domain.com
```

### Code Changes Required

#### 1. Update useWebSocket hook to use environment variables
File: `/src/hooks/useWebSocket.ts`

```typescript
// Replace hardcoded localhost with environment variable
const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3051';
```

#### 2. Update App.tsx WebSocket connection
File: `/src/App.tsx` - Line 16

```typescript
// Change from:
const { isConnected, lastMessage, clearLastMessage } = useWebSocket('ws://localhost:3051');

// To:
const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:3051';
const { isConnected, lastMessage, clearLastMessage } = useWebSocket(wsUrl);
```

#### 3. Update webhook display URL
File: `/src/App.tsx` - Line 95

```typescript
// Change from:
<code>http://localhost:3051/webhook</code>

// To:
<code>{process.env.REACT_APP_API_URL || 'http://localhost:3051'}/webhook</code>
```

## Backend Deployment Options for Vercel Frontend

### Option 1: Railway (Recommended)
- Full WebSocket support
- Easy deployment from GitHub
- Built-in SSL certificates
- Cost: ~$5/month for basic usage

### Option 2: Render
- WebSocket support
- Free tier available
- Automatic SSL
- Cost: Free tier, $7/month for production

### Option 3: AWS EC2 with Application Load Balancer
- Full control
- WebSocket support via ALB
- More complex setup
- Cost: ~$10-20/month minimum

## Vercel Configuration

### vercel.json
```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": { "distDir": "build" }
    }
  ],
  "routes": [
    {
      "src": "/static/(.*)",
      "headers": { "cache-control": "s-maxage=31536000,immutable" },
      "dest": "/static/$1"
    },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

## Pros and Cons

### Pros:
- Excellent frontend performance and CDN
- Easy deployment and CI/CD
- Great developer experience
- Automatic SSL
- Global edge network

### Cons:
- No WebSocket support (requires external backend)
- Split architecture complexity
- Additional backend hosting costs
- CORS configuration needed
- More complex environment management