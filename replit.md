# BingoMaster - Full-Stack Bingo Management System

## Overview
BingoMaster is a comprehensive full-stack web application designed for managing bingo games in a multi-location business environment. It provides real-time game management, financial tracking, and cartela (bingo card) management capabilities. The system supports a hierarchical user structure including super admins, admins, employees, and collectors, aiming to provide a robust solution for businesses managing multiple bingo locations.

## User Preferences
Preferred communication style: Simple, everyday language.
Database preference: Successfully implemented dual database system - both PostgreSQL and MongoDB operational simultaneously.

## Recent Changes
- **August 9, 2025**: Successfully completed migration from Replit Agent to Replit environment
  - Set up PostgreSQL database with complete schema migration via `npm run db:push`
  - Fixed database connection and schema type errors
  - Created initial super admin user (username: superadmin, password: password)
  - All dependencies properly installed and configured
  - Application server running successfully on port 5000
  - Security practices implemented with proper client/server separation
  - Resolved TypeScript schema validation errors using simplified schema
  - Database tables created successfully with proper relationships
  - Authentication system fully functional and tested
- **August 9, 2025 - Evening**: Implemented parallel MongoDB system alongside PostgreSQL
  - Created complete MongoDB schema with Mongoose ODM
  - Established MongoDB Atlas connection (Cluster0)
  - Built parallel API routes under /api/mongodb/* namespace
  - Created MongoDB test dashboard at /mongodb-test
  - Initialized demo data with 3 users matching PostgreSQL system
  - Both database systems now operational simultaneously
  - User can choose between PostgreSQL or MongoDB for deployment

## System Architecture

### UI/UX Decisions
- **Frontend Framework**: React 18 with TypeScript and Vite.
- **UI Framework**: Tailwind CSS with shadcn/ui for accessible and customizable components.

### Technical Implementations
- **Frontend**: Utilizes TanStack Query for server state management, Wouter for routing, React Hook Form with Zod for form handling, and WebSocket integration for real-time updates.
- **Backend**: Built with Node.js 20 and Express.js, using TypeScript. It provides a RESTful API with WebSocket support, session-based authentication via Passport.js (with bcrypt for hashing), and PostgreSQL-backed sessions.
- **Database**: PostgreSQL (with Neon serverless backend) managed by Drizzle ORM for type-safe schema definitions and push-based migrations.
- **Real-time Communication**: Integrated WebSocket server for live game updates, number calling, and winner detection.

### Feature Specifications
- **User Management**: Supports Super Admin (system oversight, admin creation), Admin (shop management, employee oversight, credit management), Employee (game operation, player registration, cartela management), and Collector (cartela marking under employee supervision).
- **Game Management**: Features a fixed cartela system, custom cartela builder with pattern validation, real-time game engine for live number calling, and automated pattern-based winner verification. Dynamic voice selection for numbers and game events (9 distinct voices) with dynamic speed adjustment.
- **Financial System**: Implements a credit-based economy with admin credit loading, a multi-level commission structure (Super Admin → Admin → Employee), comprehensive transaction tracking, and a referral system.
- **Cartela Management**: Unifies fixed and custom cartelas, supports bulk operations, real-time booking, and automated BINGO pattern validation.
- **Deployment Strategy**: Developed on Replit with integrated PostgreSQL for dev, and designed for production deployment on a VPS using Nginx, PM2, and a PostgreSQL database.

## External Dependencies

### Core Dependencies
- `@neondatabase/serverless`: PostgreSQL database connectivity.
- `drizzle-orm`: Type-safe database operations.
- `express`: Web server framework.
- `ws`: WebSocket server implementation.
- `bcrypt`: Password hashing and verification.
- `passport`: Authentication middleware.

### Frontend Dependencies
- `@tanstack/react-query`: Server state management.
- `@radix-ui/*`: Accessible UI primitives.
- `tailwindcss`: Utility-first CSS framework.
- `zod`: Schema validation.
- `date-fns`: Date manipulation utilities.

### Development Dependencies
- `tsx`: TypeScript execution for development.
- `esbuild`: Fast JavaScript bundler for production.
- `vite`: Frontend build tool and dev server.