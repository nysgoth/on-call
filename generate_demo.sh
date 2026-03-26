#!/bin/bash
# Script to generate demo incidents
# Usage: ./generate_demo.sh

echo "Generating demo incidents for the last month..."

# Run the script inside the backend container
docker-compose exec -T backend python /app/generate_demo_incidents.py

