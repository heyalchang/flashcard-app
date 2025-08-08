#!/bin/bash

echo "Testing immediate flashcard advancement..."
echo "Sending test answers to the webhook..."

# Send a correct answer
echo "Sending answer: 42"
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -d '{"answer": 42}' \
  -s

sleep 1

# Send another answer
echo "Sending answer: 15"
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -d '{"answer": 15}' \
  -s

sleep 1

# Send one more answer
echo "Sending answer: 100"
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -d '{"answer": 100}' \
  -s

echo "Test completed. Check the UI to verify immediate question advancement."