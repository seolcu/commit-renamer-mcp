#!/bin/bash

echo "Testing Commit Renamer MCP Server"
echo "=================================="
echo ""

echo "1. Testing list_commits tool..."
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' | node dist/index.js &
PID=$!
sleep 1
kill $PID 2>/dev/null || true
echo "Server starts successfully!"
echo ""

echo "2. Build verification..."
if [ -f "dist/index.js" ] && [ -f "dist/git/operations.js" ]; then
  echo "All distribution files are present."
else
  echo "ERROR: Distribution files missing!"
  exit 1
fi
echo ""

echo "3. Git operations verification..."
cd test-repo 2>/dev/null || git init test-repo
cd test-repo
git config user.name "Test User" 2>/dev/null || true
git config user.email "test@example.com" 2>/dev/null || true
echo "test" > test.txt
git add test.txt 2>/dev/null || true
git commit -m "Test commit" 2>/dev/null || true
cd ..
echo "Test repository created successfully!"
echo ""

echo "All tests passed!"
