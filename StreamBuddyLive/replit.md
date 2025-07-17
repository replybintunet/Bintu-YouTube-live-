# replit.md

## Overview

This is a full-stack YouTube streaming application built with React (frontend) and Express.js (backend). The application allows users to upload video files and stream them to YouTube using FFmpeg. It features a modern UI with shadcn/ui components, real-time streaming controls, and comprehensive activity logging.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **File Handling**: Multer for video file uploads
- **Streaming**: FFmpeg integration for YouTube live streaming
- **Session Management**: PostgreSQL-based session storage

### Build System
- **Development**: Concurrent frontend (Vite) and backend (tsx) servers
- **Production**: Vite builds static assets, esbuild bundles backend
- **Type Safety**: Shared TypeScript schemas between frontend and backend

## Key Components

### Database Schema
- **Users**: User authentication and management
- **Streams**: Stream configuration and metadata
- **Stream Stats**: Real-time streaming metrics (viewers, upload speed, dropped frames)
- **Activity Logs**: Comprehensive logging of all stream activities

### Core Services
- **YouTubeStreamService**: Manages FFmpeg processes for live streaming
- **Storage Layer**: Abstracted storage interface with in-memory fallback
- **File Upload**: Handles MP4 video file uploads with validation

### UI Components
- **Stream Dashboard**: Main interface for stream management
- **File Upload**: Drag-and-drop video file upload with progress
- **Stream Controls**: Start/stop streaming with real-time status
- **Stream Status**: Live metrics display (connection, upload speed, viewers)
- **Activity Log**: Real-time activity feed with different log levels

## Data Flow

1. **File Upload**: Users upload MP4 files through drag-and-drop interface
2. **Stream Configuration**: Users set stream title, YouTube stream key, and quality
3. **Stream Creation**: Backend creates stream record in database
4. **Streaming Process**: FFmpeg streams video file to YouTube RTMP endpoint
5. **Real-time Updates**: Frontend polls for stream status and metrics
6. **Activity Logging**: All actions are logged with timestamps and severity levels

## External Dependencies

### Core Libraries
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Accessible UI primitives
- **multer**: File upload handling
- **ffmpeg**: Video streaming (external binary dependency)

### Development Tools
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production
- **tailwindcss**: Utility-first CSS framework
- **@replit/vite-plugin-runtime-error-modal**: Development error handling

## Deployment Strategy

### Environment Requirements
- **DATABASE_URL**: PostgreSQL connection string (required)
- **NODE_ENV**: Environment flag (development/production)
- **FFmpeg**: Must be available in system PATH for streaming functionality

### Build Process
1. **Frontend**: Vite builds optimized static assets to `dist/public`
2. **Backend**: esbuild bundles server code to `dist/index.js`
3. **Database**: Drizzle migrations applied via `db:push` command

### Runtime Considerations
- Backend serves static frontend assets in production
- File uploads stored in `uploads/` directory (needs write permissions)
- FFmpeg processes spawned for each active stream
- PostgreSQL session storage for user sessions
- Real-time polling for stream status updates

### Scaling Notes
- In-memory storage fallback for development/testing
- File uploads limited to 1GB MP4 files
- Single active stream supported per user
- Activity logs provide audit trail for debugging
- Fixed mobile streaming mode to use portrait resolution (720:1280, 1080:1920) for full-screen mobile viewing
- Added stream key validation and testing functionality
- Enhanced FFmpeg error handling and logging for better debugging
- Added automatic video file deletion after streaming stops for privacy and storage management
- Implemented secure access gate with default code "bintunet" and optional biometric authentication
- Fixed video upload issues with improved file type detection and error handling
- Increased video upload limit to 1GB for large video files
- Added YouTube channel link (https://youtube.com/@talesofbintu) and WhatsApp contact (+25429499463) in header