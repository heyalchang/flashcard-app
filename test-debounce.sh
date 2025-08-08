#!/bin/bash

echo "Testing webhook debouncing (900ms threshold)"
echo "============================================"
echo ""

# Test 1: Two rapid requests (should debounce second one)
echo "Test 1: Sending two requests rapidly (second should be debounced)"
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -d '{"number": 10, "test": "first"}' &

curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -d '{"number": 10, "test": "second"}'

sleep 1
echo ""
echo "---"
echo ""

# Test 2: Two requests with 1 second gap (both should go through)
echo "Test 2: Sending two requests with 1 second gap (both should work)"
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -d '{"number": 15, "test": "third"}'

sleep 1

curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -d '{"number": 15, "test": "fourth"}'

echo ""
echo "---"
echo "Check server console for debounce messages!"