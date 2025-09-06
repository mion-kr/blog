# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern full-stack blog application built with a Turborepo monorepo structure:
- **Frontend**: Next.js 15 with App Router, Tailwind CSS, and MDX support
- **Backend**: Nest.js API with JWT authentication and Swagger documentation
- **Database**: PostgreSQL with Drizzle ORM and UUIDv7 primary keys
- **Package Manager**: pnpm with workspace support

## Commands

### Development
```bash
# Start all services concurrently
pnpm dev

# Start specific services
pnpm --filter=blog-web dev    # Frontend only (port 3000)
pnpm --filter=blog-api dev    # Backend only (port 3001)

# Database operations
pnpm --filter=@repo/database generate   # Generate migrations
pnpm --filter=@repo/database migrate    # Run migrations
pnpm --filter=@repo/database push       # Push schema to database
pnpm --filter=@repo/database studio     # Open Drizzle Studio
pnpm --filter=@repo/database db:seed    # Seed database with sample data
```

### Building and Testing
```bash
# Build all packages
pnpm build

# Type checking
pnpm check-types

# Linting and formatting
pnpm lint
pnpm format

# Testing (Nest.js API)
pnpm --filter=blog-api test              # Unit tests
pnpm --filter=blog-api test:watch        # Watch mode
pnpm --filter=blog-api test:cov          # Coverage report
pnpm --filter=blog-api test:e2e          # End-to-end tests
```

## Architecture

### Monorepo Structure
- `apps/blog-web/`: Next.js 15 frontend application
- `apps/blog-api/`: Nest.js backend API
- `packages/shared/`: Common types and utilities
- `packages/database/`: Drizzle ORM schemas and database configuration
- `packages/ui/`: Shared React components (in development)
- `packages/eslint-config/`: ESLint configurations
- `packages/typescript-config/`: TypeScript configurations

### Authentication Flow
- Uses NextAuth.js with Google OAuth on frontend
- JWT tokens validated by Nest.js backend using Passport strategy
- Admin privileges automatically granted to configured email address
- Stateless architecture suitable for Vercel + Railway deployment

### Database Schema
- **Users**: Google OAuth users with ADMIN/USER roles
- **Posts**: Blog posts with MDX content, slug-based URLs, and publish status
- **Categories**: Hierarchical post categorization with slug support
- **Tags**: Many-to-many tagging system with slug support
- **PostTags**: Junction table for post-tag relationships

### API Structure
- Global `/api` prefix for all endpoints
- JWT Bearer authentication for protected routes
- Swagger documentation available at `http://localhost:3001/api-docs`
- Role-based guards for ADMIN-only operations
- CORS configured for development and production domains

### Frontend Architecture
- App Router with TypeScript strict mode
- Server and client components properly separated
- MDX support with custom components
- Tailwind CSS with shadcn/ui component system
- Session management through NextAuth.js providers

## Key Technologies

- **Next.js 15**: Latest with Turbopack and React 19
- **Nest.js**: Enterprise-grade Node.js framework
- **Drizzle ORM**: Type-safe database queries with PostgreSQL
- **UUIDv7**: Time-sortable unique identifiers for all entities
- **MDX**: Markdown with React components for blog content
- **Turbo**: Build system optimized for monorepos

## Environment Setup

### Required Environment Variables
**Frontend (.env.local in blog-web/)**:
- `NEXTAUTH_URL`: Application URL
- `NEXTAUTH_SECRET`: Session encryption key
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `ADMIN_EMAIL`: Email address to grant admin privileges
- `NEXT_PUBLIC_API_URL`: Backend API URL

**Backend (.env in blog-api/)**:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing secret
- `JWT_EXPIRES_IN`: Token expiration time (default: 7d)
- `PORT`: Server port (default: 3001)
- `FRONTEND_URL`: Frontend URL for CORS
- `ADMIN_EMAIL`: Admin email for role assignment

### Development Workflow

1. **Database First**: Always create/modify Drizzle schemas before API development
2. **Type Safety**: Use shared types from `@repo/shared` package across frontend and backend
3. **API Development**: Create DTOs, controllers, and services following Nest.js patterns
4. **Frontend Integration**: Use the shared types and API client patterns

### Important Notes

- All packages use ES modules (`"type": "module"`)
- TypeScript strict mode enabled across all packages
- Database migrations are handled by Drizzle Kit
- Swagger documentation is auto-generated from decorators
- Frontend uses App Router with server components by default
- MDX components are customizable in `mdx-components.tsx`