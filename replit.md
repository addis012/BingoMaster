# BingoMaster - Full-Stack Bingo Management System

## Overview

BingoMaster is a comprehensive full-stack web application designed for managing bingo games in a multi-location business environment. The system supports a hierarchical user structure with super admins, admins, employees, and collectors, providing real-time game management, financial tracking, and cartela (bingo card) management capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Real-time Communication**: WebSocket integration for live game updates
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with WebSocket support for real-time features
- **Authentication**: Session-based authentication using Passport.js with bcrypt for password hashing
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **WebSocket Server**: Built-in WebSocket server for real-time game communication

### Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon serverless backend
- **ORM**: Drizzle ORM with TypeScript-first schema definitions
- **Migration Strategy**: Push-based migrations using drizzle-kit
- **Connection Pooling**: Neon serverless connection pooling for optimal performance

## Key Components

### User Management System
- **Super Admin**: System-wide oversight, admin creation, revenue management
- **Admin**: Shop management, employee oversight, credit system management
- **Employee**: Game operation, player registration, cartela management
- **Collector**: Cartela marking and collection under employee supervision

### Game Management
- **Fixed Cartela System**: 75 predefined bingo cards with standardized patterns
- **Custom Cartela Builder**: Dynamic cartela creation with pattern validation
- **Real-time Game Engine**: WebSocket-powered live number calling and winner detection
- **Automated Winner Verification**: Pattern-based winner validation system

### Financial System
- **Credit-based Economy**: Admin credit loading with super admin approval
- **Commission Structure**: Multi-level profit sharing (Super Admin → Admin → Employee)
- **Transaction Tracking**: Comprehensive financial audit trails
- **Referral System**: Commission-based admin referral program

### Cartela Management
- **Unified System**: Both fixed and custom cartelas in single interface
- **Bulk Operations**: Mass cartela import and management
- **Real-time Booking**: Live cartela availability tracking
- **Pattern Validation**: Automated BINGO pattern verification

## Data Flow

### Game Flow
1. Employee creates game with entry fee configuration
2. Players register with cartela selection
3. Real-time number calling via WebSocket
4. Automated winner detection and payout calculation
5. Financial transaction recording and commission distribution

### Financial Flow
1. Admin requests credit load with payment proof
2. Super admin approves/rejects credit requests
3. Approved credits added to admin balance
4. Game revenues automatically distributed per commission structure
5. Referral commissions calculated and tracked

### Real-time Communication Flow
1. WebSocket connection established per active game
2. Number calls broadcast to all connected clients
3. Winner declarations transmitted instantly
4. Game state synchronized across all participants

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **express**: Web server framework
- **ws**: WebSocket server implementation
- **bcrypt**: Password hashing and verification
- **passport**: Authentication middleware

### Frontend Dependencies
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **zod**: Schema validation
- **date-fns**: Date manipulation utilities

### Development Dependencies
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production
- **vite**: Frontend build tool and dev server

## Deployment Strategy

### Development Environment
- **Platform**: Replit with integrated PostgreSQL
- **Hot Reload**: Vite HMR for frontend, tsx for backend
- **Port Configuration**: Backend on 5000, frontend proxy through Vite
- **Database**: Automatically provisioned Neon PostgreSQL instance

### Production Deployment
- **Build Process**: Vite frontend build + esbuild backend bundle
- **Server Configuration**: Express serving both API and static assets
- **Database**: Production PostgreSQL with connection pooling
- **Process Management**: PM2 for production process management
- **Reverse Proxy**: Nginx configuration for WebSocket support

### Environment Configuration
- **Session Security**: Secure session configuration with PostgreSQL storage
- **CORS Handling**: Configurable origins for cross-origin requests
- **WebSocket Support**: Proper headers and connection handling
- **Static Assets**: Optimized serving of built frontend assets

## Recent Changes

### June 28, 2025 - Fixed Admin Game History Player Count and Database Field Mapping (COMPLETED)
- ✅ Fixed admin game history to accurately count both employee-selected and collector-marked cartelas
- ✅ Resolved database field name mapping issue: snake_case (collector_id, booked_by, cartela_number) vs camelCase
- ✅ Updated horizontal dashboard to use correct database field names for cartela filtering
- ✅ Fixed employee dashboard field mapping and added employee cartela counting logic
- ✅ Fixed cartela counting logic to combine both employee and collector cartelas in unified calculation
- ✅ Eliminated double-counting by using unified cartela count calculation
- ✅ Added "Continue Game Now" button to non-winner modal for immediate game resumption
- ✅ Game history now properly records actual player count: 9 cartelas = 270 ETB = 189 ETB prize (verified)
- ✅ Financial calculations now reflect true total collected amounts from all cartela sources
- ✅ Verified fix with test game showing correct 9-player count vs previous incorrect 6-player count

### June 27, 2025 - Manual Reset System and Game History Data Accuracy Fixes (COMPLETED)
- ✅ Removed automatic game reset after winner is found - now requires manual reset via reset button
- ✅ Fixed reset button becoming disabled after game ends - now properly available for manual reset
- ✅ Fixed collector "Reset All Cartelas" button by updating API permissions to allow collector access
- ✅ Fixed admin game history showing incorrect player numbers and financial data - now uses actual cartela count from frontend
- ✅ Fixed called numbers persisting correctly until manual reset (no auto-clear after winner detection)
- ✅ Updated frontend to send accurate game data (bookedCartelas vs selectedCartelas) to declare-winner endpoint
- ✅ Fixed backend game history recording to use frontend-provided player count instead of empty database records
- ✅ Enhanced reset mutation to use cartela reset endpoint instead of complex game completion logic
- ✅ Cleaned up database by removing multiple stacked active/paused games that caused cascade reset issues
- ✅ Updated reset functionality to work with finished game state without requiring active game ID
- ✅ Fixed frontend state management to prevent button availability issues during reset operations
- ✅ Enhanced game completion flow to keep games in finished state until manual reset
- ✅ Fixed cartela access control during active games (collectors see greyed-out, disabled cartelas)
- ✅ Completed comprehensive bidirectional cartela blocking system with proper role-based permissions
- ✅ **COMPLETELY REMOVED AUTO-RESUME BUG** - Fixed critical pause/resume button state corruption
- ✅ Added backend pause state protection to prevent auto-resume during number calling
- ✅ Fixed reset functionality to work properly with paused games while maintaining pause protection
- ✅ Pause button now properly stays as "Resume Game" without reverting to "Pause Game"

### December 21, 2024 - Collector System Implementation
- Added three-tier user hierarchy: Admin → Employee → Collector
- Implemented collector dashboard with cartela booking and marking functionality
- Enhanced employee dashboard with tabs for game management and collector oversight
- Added database support for collector tracking with `supervisor_id` column
- Created API endpoints for collector operations and management
- Fixed database schema alignment for proper authentication

## Changelog
- June 26, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.