#!/bin/bash
# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
while ! nc -z mysql 3306; do
  sleep 1
done
echo "MySQL is ready!"

# Initialize database and seed data
echo "Initializing database..."
npm run init-db

echo "Seeding database..."
npm run seed

echo "Starting application..."
npm run dev
