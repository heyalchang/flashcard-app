# Monolithic Deployment Strategy

## Quick Summary
Deploy both React frontend and Node.js backend on the same EC2 instance. Express serves everything on port 8080.

## Why Monolithic? 
- **WebSocket simplicity** - No CORS, same origin
- **Voice features work immediately** - No cross-origin issues  
- **One deployment** - Simple CodePipeline
- **You're 90% done** - Just need static file serving

## Required Changes (10 minutes total)

### 1. Update server.ts (2 minutes)
Replace current `server/src/server.ts` with `server-monolithic.ts` content.

Key additions:
```javascript
// Serve React build files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../build', 'index.html'));
  });
}
```

### 2. Update buildspec.yml (1 minute)
Replace with `buildspec-monolithic.yml` to:
- Set `REACT_APP_WS_URL` and `REACT_APP_API_URL` at build time
- Include React build output in artifacts
- Keep all server files

### 3. Update start script (2 minutes)
```bash
#!/bin/bash
cd /home/ec2-user/flashcard-app

# Set production environment
export NODE_ENV=production
export PORT=8080

# Get EC2 public IP or ALB URL
export PUBLIC_URL=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
export WEBHOOK_URL="http://${PUBLIC_URL}:8080/webhook"

# Start with PM2 or systemd
node server/dist/server.js
```

### 4. Environment Variables Needed
In AWS Secrets Manager or EC2 environment:
```
NODE_ENV=production
PORT=8080
PIPECAT_API_KEY=sk_your-key-here
PIPECAT_AGENT_NAME=flashcard-voice-agent
```

## Deployment Steps

1. **Make changes locally:**
```bash
# Copy monolithic server
cp server/src/server-monolithic.ts server/src/server.ts

# Copy monolithic buildspec  
cp buildspec-monolithic.yml buildspec.yml

# Commit and push
git add -A
git commit -m "Configure monolithic deployment with frontend serving"
git push origin deployment-test
```

2. **Store secrets in AWS:**
```bash
aws secretsmanager create-secret \
  --name flashcard-app/production \
  --secret-string '{"PIPECAT_API_KEY": "sk_your-actual-key"}'
```

3. **Trigger pipeline:**
```bash
aws codepipeline start-pipeline-execution \
  --name flashcard-app-pipeline
```

4. **After deployment, get ALB URL:**
```bash
# Get EC2 instance ID
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=flashcard-app-ec2" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text)

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "Access your app at: http://${PUBLIC_IP}:8080"
```

## What This Gives You

✅ **Frontend**: Served at http://your-ec2:8080/  
✅ **API**: Same origin at /api/*  
✅ **WebSocket**: Same origin, no CORS  
✅ **Voice**: Works immediately  
✅ **PipeCat Webhook**: http://your-ec2:8080/webhook  

## Future Optimization (When Needed)

If you get significant traffic, then consider:
1. Move React build to S3 + CloudFront
2. Keep API on EC2/ECS
3. Add Redis for WebSocket scaling
4. Use ALB with sticky sessions

But for now, **monolithic works perfectly** for your use case.

## Testing After Deployment

1. **Check health:**
```bash
curl http://your-ec2:8080/health
```

2. **Check frontend:**
```bash
curl http://your-ec2:8080/ | grep "<title>"
```

3. **Check WebSocket:**
```javascript
// In browser console
const ws = new WebSocket('ws://your-ec2:8080');
ws.onopen = () => console.log('Connected!');
```

## Troubleshooting

**Frontend shows blank page:**
- Check if build files exist: `ls -la /home/ec2-user/flashcard-app/build/`
- Check Express static serving in server.ts

**WebSocket won't connect:**
- Ensure using `ws://` not `wss://` until ALB configured
- Check security group allows port 8080

**Voice not working:**
- Verify PIPECAT_API_KEY is set
- Check webhook URL is publicly accessible
- Update PipeCat agent with EC2 public URL