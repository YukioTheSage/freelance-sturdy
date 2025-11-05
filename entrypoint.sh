#!/bin/bash
# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
while ! nc -z postgres 5432; do
  sleep 1
done
echo "PostgreSQL is ready!"

# Initialize database and seed data
echo "Initializing database..."
npm run init-db

echo "Seeding database..."
npm run seed

echo "Starting application..."
npm run dev
