
  Development Workflow:

  # 1. Set up stable ngrok URL
  ngrok http 3051 --subdomain=flashcard-dev  # Requires paid ngrok

  # 2. Update bot.py environment
  WEBHOOK_URL=https://flashcard-dev.ngrok.io/webhook

  # 3. Deploy bot to PipeCat Cloud with this webhook
  pcc deploy

  # 4. Run backend with PipeCat API key
  PIPECAT_API_KEY=sk_d36c7f3e-015f-4a57-ac35-3b92c1892899 npm run dev

  # 5. Frontend automatically connects
  npm start

  State Machine:

  OFF → [Click Voice] → CONNECTING → [Daily Joined] → ACTIVE
                                         ↓
  ACTIVE → [Goodbye/Click/Timeout] → DISCONNECTING → OFF
     ↓
  [Mute] → ACTIVE_MUTED → [Unmute] → ACTIVE

  Production Deployment Notes:

  1. Elastic Beanstalk:
    - Set WEBHOOK_URL=https://your-app.elasticbeanstalk.com/webhook in bot.py env
    - Set PIPECAT_API_KEY in EB environment variables
  2. Railway:
    - Similar env var setup
    - Ensure WebSocket support enabled
  3. Security:
    - API key only on backend
    - Session validation
    - Rate limiting on session creation

  Ready to implement, this plan is. Seamless voice experience, we shall create.
