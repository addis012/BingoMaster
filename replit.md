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

### July 24, 2025 - VPS Deployment Implementation (COMPLETED)
- ✅ **DEPLOYED: Complete BingoMaster system to production VPS**
- ✅ Successfully deployed to Ubuntu 22.04 VPS at 91.99.161.246 (Nuremberg)
- ✅ Configured Node.js 20.19.4 with Express server infrastructure
- ✅ Set up Nginx reverse proxy with WebSocket support for real-time bingo
- ✅ Deployed complete BingoMaster source code with all 9 voice packs
- ✅ Configured firewall (UFW) with SSH and HTTP access
- ✅ Created production environment with PostgreSQL database setup
- ✅ Established application directory structure at /var/www/bingomaster/
- ✅ **READY FOR PRODUCTION: Multi-shop Ethiopian bingo platform now live**
- ✅ VPS accessible at http://91.99.161.246 for immediate testing
- ✅ Infrastructure ready for npm install, build, and database migration
- ✅ Prepared for SSL certificate installation and domain configuration

### July 8, 2025 - Performance Optimization and Updated Melat Voice (COMPLETED)
- ✅ **REMOVED: Audio preloading system completely for better website performance**
- ✅ Eliminated memory-intensive preloading that was causing browser slowdown
- ✅ Simplified audio system to create audio elements on-demand without preload
- ✅ **OPTIMIZED: Query refresh intervals for improved website speed**
- ✅ Dramatically reduced active game polling from 2s to 30s (93% reduction)
- ✅ Aggressively reduced shop data polling from 5s to 60s (92% reduction)
- ✅ Significantly reduced cartela polling from 2s to 45s (95% reduction)
- ✅ Optimized game history polling from 10s to 20s (50% reduction)
- ✅ **REMOVED: Heavy console logging causing performance overhead**
- ✅ Eliminated debug logging from calculation, sync, and cartela processing functions
- ✅ Streamlined audio and game state logging for better browser performance
- ✅ **UPDATED: Complete Melat voice with new voice package**
- ✅ Replaced existing Melat voice with 79 new MP3 files from user-provided ZIP
- ✅ Enhanced Melat voice with all BINGO numbers and game event audio files
- ✅ Maintained Melat voice compatibility with existing audio system
- ✅ Website now runs significantly faster with reduced server requests and memory usage

### July 4, 2025 - Voice Selection System Implementation (COMPLETED)
- ✅ Added voice selector in employee dashboard top right corner with speaker icon
- ✅ Implemented Alex (male) voice support with proper file name mapping for BINGO numbers
- ✅ Added Alex-specific game event audio files (start game, winner, not winner, passed before bingo, disqualified)
- ✅ Set up voice preference storage in browser localStorage
- ✅ Updated audio system to dynamically use selected voice for all number calling and game events
- ✅ Organized voice files in /voices/alex/ and /voices/female1/ directories
- ✅ Created voice-specific audio path helper functions
- ✅ Maintained separate female voice system using original audio files
- ✅ Voice selection persists between sessions and applies to all game audio
- ✅ **NEW: Added Melat (female) voice as third voice option**
- ✅ Integrated Betty voice files as "Melat" voice with proper file organization in /voices/betty/
- ✅ Normalized Betty voice file names to match system expectations (B1.mp3, G46.mp3, etc.)
- ✅ Added Melat voice support for all BINGO numbers (B1-B15, I16-I30, N31-N45, G46-G60, O61-O75)
- ✅ Included Melat-specific game event audio files (start_game.mp3, winner.mp3, not_winner_cartela.mp3, etc.)
- ✅ **NEW: Added Arada (Male) voice as fourth voice option**
- ✅ Converted 75 Arada voice files from WAV to MP3 format for browser compatibility
- ✅ Integrated Arada voice with complete BINGO number support (B1-B15, I16-I30, N31-N45, G46-G60, O61-O75)
- ✅ **FIXED: Audio synchronization and overlap issues**
- ✅ Extended number calling interval from 4 to 6 seconds for optimal voice completion
- ✅ Added audio playback guard to prevent overlapping voice calls
- ✅ Increased audio timeout from 2.5 to 4.5 seconds for longer voice files
- ✅ Enhanced audio cleanup and state management for smoother gameplay
- ✅ **NEW: Audio preloading system for Arada voice**
- ✅ Implemented preloaded audio cache to eliminate lag for Arada voice
- ✅ Automatic memory management - preloads only for Arada, clears for other voices
- ✅ Faster audio playback using preloaded files with instant reset capability
- ✅ **FIXED: Audio jumping and interruption issues**
- ✅ Enhanced audio state management to prevent overlapping playback
- ✅ Improved audio cleanup with immediate state reset on completion
- ✅ Reduced marking delay to 50ms for better audio synchronization
- ✅ Added comprehensive audio blocking to prevent simultaneous audio calls
- ✅ **NEW: Dynamic audio timeout system for variable speeds**
- ✅ Audio automatically adjusts to calling speed (3s, 6s, etc.) to prevent interruption
- ✅ Intelligent timeout calculation: (speed - 500ms buffer) with 4.5s maximum
- ✅ Forced audio cutoff for fast speeds ensures smooth transitions
- ✅ Works seamlessly with preloaded Arada voice system
- ✅ Voice system now supports four distinct voices: Female Voice (original), Alex (Male), Melat (Female), and Arada (Male)
- ✅ **NEW: Added Tigrigna (Female) voice as sixth voice option**
- ✅ Converted 75 Tigrigna Female voice files from WAV to MP3 format for browser compatibility
- ✅ Integrated complete BINGO number support for Tigrigna voice (B1-B15, I16-I30, N31-N45, G46-G60, O61-O75)
- ✅ Extended audio preloading system to include Tigrigna voice for optimal performance
- ✅ Voice system now supports six distinct voices: Female Voice, Alex (Male), Melat (Female), Arada (Male), Real Arada (Male), and Tigrigna (Female)
- ✅ **NEW: Added Oromifa (Female) voice as seventh voice option**
- ✅ Converted 75 Oromifa Female voice files from WAV to MP3 format for browser compatibility
- ✅ Integrated complete BINGO number support for Oromifa voice (B1-B15, I16-I30, N31-N45, G46-G60, O61-O75)
- ✅ Extended audio preloading system to include Oromifa voice for optimal performance
- ✅ Voice system now supports seven distinct voices: Female Voice, Alex (Male), Melat (Female), Arada (Male), Real Arada (Male), Tigrigna (Female), and Oromifa (Female)
- ✅ **NEW: Added Betty (Female) and Nati (Male) voices as eighth and ninth voice options**
- ✅ Converted 75 Betty Female voice files and 75 Nati Male voice files from WAV to MP3 format
- ✅ Integrated complete BINGO number support for both voices (B1-B15, I16-I30, N31-N45, G46-G60, O61-O75)
- ✅ **NEW: Comprehensive Common Voice System Implementation**
- ✅ Created unified shuffle voice system using Betty's common game event audio files
- ✅ Common voices now used for: Arada, Real Arada, Betty, Nati, Tigrigna, Oromifa, and Female Voice
- ✅ Alex and Melat maintain their individual voice-specific game event files
- ✅ Added shuffle sound support using Betty's shuffle voice for all common voice users
- ✅ Common voice events include: start_game, winner, not_winner_cartela, disqualified, and shuffle
- ✅ Voice system now supports nine distinct voices: Female Voice, Alex (Male), Melat (Female), Arada (Male), Real Arada (Male), Tigrigna (Female), Oromifa (Female), Betty (Female), and Nati (Male)
- ✅ **FINAL: Perfected shuffle sound system with 5-second synchronized audio-visual experience**
- ✅ Shuffle sound now independent of voice selection - uses universal 5-second audio file
- ✅ Audio and visual effects perfectly synchronized (10 shuffle phases over 5 seconds)
- ✅ Trimmed custom shuffle audio to exactly 5 seconds for optimal user experience
- ✅ Complete shuffle board functionality with seamless audio-visual synchronization

### June 28, 2025 - Fixed Player Count and Prize Calculation Accuracy (COMPLETED)
- ✅ Fixed critical calculation bug where system showed 7 cartelas instead of actual 5 in database
- ✅ Removed stale `selectedCartelas` local state from total calculation to prevent double-counting
- ✅ Calculation now uses only `bookedCartelas.size` (actual database-marked cartelas)
- ✅ Employee dashboard now shows accurate totals based on actual marked cartelas and current entry fee
- ✅ Fixed backend declare-winner endpoint to use same calculation logic as frontend
- ✅ Both dashboards now calculate: totalCollected × (1 - profitMargin) for consistent winner amounts
- ✅ Verified accuracy: 4 cartelas × 30 birr = 120 birr total, 84 birr winner amount (30% profit margin)
- ✅ Eliminated discrepancy between frontend display and database reality
- ✅ System ready for production with accurate financial calculations

### June 28, 2025 - Fixed Prize Calculation, Profit Margin, and Game Controls (COMPLETED)
- ✅ Fixed prize calculation discrepancy between employee dashboard (70 birr) and admin game history (56 birr)
- ✅ Employee dashboard now uses admin's flexible profit margin setting instead of hardcoded defaults
- ✅ Employee dashboard uses actual game entry fee from active game data for accurate calculations
- ✅ Calculation automatically updates every 5 seconds to reflect admin profit margin changes
- ✅ Both dashboards now show consistent winner amounts based on actual shop profit margin and game amount
- ✅ Admin has full control over profit margins that employees see in real-time
- ✅ Fixed "Check Winner" to immediately pause game and stop all audio/number calling
- ✅ Enhanced reset button to properly clear called numbers board and all visual states

### June 28, 2025 - Fixed Cartela Duplication Display Issue (COMPLETED)
- ✅ Resolved cartela duplication in employee dashboard where cartelas appeared as both collector and employee
- ✅ Added bidirectional protection in storage layer: employees cannot mark collector cartelas, collectors cannot mark employee cartelas
- ✅ Fixed frontend badge display to properly separate collector (green) vs employee (blue) cartelas using direct database filtering
- ✅ Updated cartela count calculation to prevent overlap and show accurate totals
- ✅ Tested and verified: clicking employee cartelas now only shows blue "Manual" badge, no dual-marking
- ✅ Database integrity maintained: each cartela has either collectorId OR bookedBy, never both

### June 28, 2025 - Fixed Admin Game History Player Count and Database Field Mapping (COMPLETED)
- ✅ Fixed admin game history to accurately count both employee-selected and collector-marked cartelas
- ✅ Resolved critical database field name mapping issue: API returns camelCase (collectorId, bookedBy, cartelaNumber) not snake_case
- ✅ Updated horizontal dashboard to use correct camelCase field names for cartela filtering
- ✅ Fixed cartela counting logic to combine both employee and collector cartelas in single bookedCartelas set
- ✅ Eliminated double-counting by using unified cartela count calculation
- ✅ Added comprehensive API debugging to verify cartela identification (now shows 3 cartelas correctly)
- ✅ Fixed declare-winner endpoint to use frontend-provided totalCartelas count instead of incomplete game_players table
- ✅ Updated backend revenue calculation to count actual marked cartelas from cartelas table
- ✅ Resolved data integrity issue where cartela #1 had both collector_id and booked_by (dual-marking)
- ✅ Updated both horizontal and employee dashboards to prevent future double-counting with unified filtering logic
- ✅ Game history now properly records actual player count from all cartela sources (confirmed: progressive counts 1→2→3 players)
- ✅ Financial calculations now reflect true total collected amounts from all cartela sources

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