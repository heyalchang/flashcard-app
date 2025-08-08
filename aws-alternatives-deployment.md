# Alternative AWS Deployment Options

## Option 1: AWS Elastic Beanstalk (Recommended for Full-Stack)

### Architecture:
```
Single Elastic Beanstalk Application
├── Frontend (React build served via Express static)
├── Backend (Express + WebSocket server)
└── Application Load Balancer (automatic WebSocket support)
```

### Benefits:
- ✅ Full WebSocket support out of the box
- ✅ Single deployment unit
- ✅ Automatic scaling
- ✅ Load balancer included
- ✅ Minimal code changes required

### Required Changes:

#### 1. Modify server.ts to serve React build
```typescript
// Add this to server/src/server.ts after line 13
import path from 'path';

// Serve React app (add after CORS setup)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../build')));
  
  // Catch all handler for React Router
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/webhook') && !req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      res.sendFile(path.join(__dirname, '../../build/index.html'));
    }
  });
}
```

#### 2. Update package.json for deployment
```json
{
  "scripts": {
    "build": "npm run build:client && npm run build:server",
    "build:client": "react-scripts build",
    "build:server": "cd server && npm run build",
    "start": "cd server && npm start",
    "postinstall": "cd server && npm install"
  }
}
```

#### 3. Create .ebextensions/websockets.config
```yaml
option_settings:
  aws:elasticbeanstalk:environment:proxy:
    ProxyServer: nginx
  aws:elbv2:listener:443:
    Protocol: HTTPS
    SSLCertificateArns: arn:aws:acm:region:account:certificate/certificate-id
```

#### 4. Environment Variables
```bash
# In Elastic Beanstalk console
NODE_ENV=production
PORT=8080  # Elastic Beanstalk default
```

#### 5. Update WebSocket URL for production
```typescript
// In useWebSocket.ts
const getWebSocketUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // Use same domain as the app, but with WebSocket protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }
  return 'ws://localhost:3051';
};
```

### Cost: ~$20-40/month
### Complexity: Low-Medium
### Migration Effort: Minimal

---

## Option 2: AWS EC2 + Docker + Application Load Balancer

### Architecture:
```
Application Load Balancer
├── Target Group (EC2 instances)
├── Auto Scaling Group
└── EC2 instances running Docker containers
```

### Benefits:
- ✅ Full control over environment
- ✅ Docker containerization
- ✅ WebSocket support via ALB
- ✅ Horizontal scaling

### Required Files:

#### Dockerfile
```dockerfile
# Frontend build stage
FROM node:18-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Backend build stage
FROM node:18-alpine AS backend-builder
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --only=production
COPY server/ .
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=backend-builder /app/server/dist ./dist
COPY --from=backend-builder /app/server/node_modules ./node_modules
COPY --from=frontend-builder /app/build ./public
COPY server/package.json ./

EXPOSE 8080
CMD ["node", "dist/server.js"]
```

#### docker-compose.yml (for local testing)
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
```

### Cost: ~$25-50/month
### Complexity: Medium
### Migration Effort: Medium

---

## Option 3: AWS ECS Fargate + Application Load Balancer

### Architecture:
```
Application Load Balancer
├── ECS Service (Fargate tasks)
├── Task Definition
└── Container Registry (ECR)
```

### Benefits:
- ✅ Serverless containers
- ✅ No server management
- ✅ Automatic scaling
- ✅ WebSocket support

### Required Changes:
- Same Dockerfile as Option 2
- ECS Task Definition
- ECS Service configuration

### Cost: ~$15-30/month
### Complexity: Medium-High
### Migration Effort: Medium

---

## Option 4: AWS Lightsail (Simplest AWS Option)

### Architecture:
```
Single Lightsail Instance
├── Node.js application
├── Built-in load balancer
└── Automatic SSL certificate
```

### Benefits:
- ✅ Predictable pricing
- ✅ Simple setup
- ✅ WebSocket support
- ✅ Managed SSL certificates

### Required Changes:
- Same as Elastic Beanstalk option
- Single instance deployment

### Cost: $10-20/month (fixed)
### Complexity: Low
### Migration Effort: Minimal

---

## Recommendation Matrix

| Option | WebSocket Support | Complexity | Cost/Month | Best For |
|--------|------------------|------------|------------|----------|
| Elastic Beanstalk | ✅ Excellent | Low-Medium | $20-40 | Most users |
| EC2 + Docker | ✅ Excellent | Medium | $25-50 | Custom requirements |
| ECS Fargate | ✅ Excellent | Medium-High | $15-30 | Container experts |
| Lightsail | ✅ Good | Low | $10-20 | Simple deployments |

## Final Recommendation: AWS Elastic Beanstalk

**Why?**
- Minimal code changes required
- Built-in WebSocket support
- Automatic scaling and load balancing
- Good balance of simplicity and features
- Reasonable cost for the functionality provided
- Easy rollback and version management