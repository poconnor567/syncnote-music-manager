#!/bin/bash

# Kill any processes running on ports 3000 and 5000
echo "Checking for processes on ports 3000 and 5000..."

# Kill processes on port 3000 (React)
PORT_3000_PID=$(lsof -ti:3000)
if [ ! -z "$PORT_3000_PID" ]; then
  echo "Killing process on port 3000 (PID: $PORT_3000_PID)"
  kill -9 $PORT_3000_PID
else
  echo "No process found on port 3000"
fi

# Kill processes on port 5000 (Express)
PORT_5000_PID=$(lsof -ti:5000)
if [ ! -z "$PORT_5000_PID" ]; then
  echo "Killing process on port 5000 (PID: $PORT_5000_PID)"
  kill -9 $PORT_5000_PID
else
  echo "No process found on port 5000"
fi

# Wait a moment for processes to fully terminate
sleep 1

# Start the development servers
echo "Starting development servers..."
npm run dev 