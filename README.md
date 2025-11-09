# NextLift Workout Tracker - Backend

## About

NextLift is a workout tracking application that helps users log exercises, track personal records, and monitor their progress over time. This REST API handles user authentication, workout management, exercise libraries, and personal record tracking.

REST API backend for the NextLift workout tracking application built with NestJS and PostgreSQL/Prisma.

## Tech Stack

- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT + Passport.js (Local & JWT strategies)
- **Validation**: class-validator + class-transformer
- **Logging**: Pino
- **Email**: SendGrid
- **Package Manager**: pnpm

## Quick Start

### Using Docker (Recommended)

```bash
# Start database + API + Prisma Studio
docker compose up

# The API will be available at http://localhost:3000
# Prisma Studio will be available at http://localhost:5555
```

### Local Development

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npx prisma migrate deploy

# Seed the database
npx prisma db seed

# Start development server
pnpm start:dev
```

## Development Scripts

```bash
# Development
pnpm start:dev          # Start with hot reload
pnpm start:debug        # Start with debugger

# Database
npx prisma migrate dev  # Create and apply migration
npx prisma generate     # Generate Prisma client
npx prisma studio       # Open Prisma Studio
npx prisma db seed      # Seed database

# Testing
pnpm test              # Unit tests
pnpm test:e2e          # End-to-end tests
pnpm test:cov          # Test coverage

# Build & Production
pnpm build             # Build for production
pnpm start:prod        # Start production server
```

## Project Structure

- `src/auth/` - Authentication (JWT, local strategy)
- `src/users/` - User management
- `src/workouts/` - Workout CRUD operations
- `src/exercises/` - Exercise management
- `src/email/` - Email service integration
- `src/prisma/` - Database service
- `src/common/` - Shared utilities, guards, decorators
- `prisma/` - Database schema and migrations

## Features

- **JWT Authentication** with refresh tokens (HTTP-only cookies)
- **Email confirmation** and password reset
- **Workout tracking** with exercises and sets
- **Personal records** tracking
- **Exercise library** with seeded data
- **Input validation** and sanitization
- **Structured logging** with Pino
- **Comprehensive testing** setup

## Environment Variables

Create a `.env` file with:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
JWT_SECRET="your-jwt-secret"
SENDGRID_API_KEY="your-sendgrid-key"
SENDGRID_VERIFIED_SENDER_EMAIL="your-verified@email.com"
FRONTEND_URL="http://localhost:3000"
```
