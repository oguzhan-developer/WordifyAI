#!/bin/bash

# Main control loop for the dual-agent system

echo "Starting the WordBox Autonomous Dual Agent System..."
echo "Press [CTRL+C] to stop the loop."

# Run the agents in a loop
while true; do
  echo "---"

  # Run Agent-1
  echo "$(date +"%Y-%m-%d %H:%M:%S") - Running Agent-1 (User Experience & Product)..."
  ./AGENT-1.sh

  # Wait for a moment before the next agent runs
  sleep 5

  # Run Agent-2
  echo "$(date +"%Y-%m-%d %H:%M:%S") - Running Agent-2 (Technical & Implementation)..."
  ./AGENT-2.sh

  # Wait before the next cycle
  echo "---"
  echo "Cycle complete. Waiting for the next cycle to start in 10 seconds..."
  sleep 10
done
