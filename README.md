# AI-Powered Social Media Management Platform

A comprehensive social media management platform with AI-powered content generation, scheduling, analytics, and multi-platform support.

## Features

- **Multi-Platform Management**: Connect and manage Twitter, LinkedIn, Instagram, and Facebook accounts
- **AI Content Generation**: Create posts, hashtags, and content calendars using OpenAI
- **Scheduling**: Schedule posts for optimal engagement times
- **Analytics**: Track performance metrics across all platforms
- **Sentiment Analysis**: Analyze content sentiment before publishing
- **Team Collaboration**: Manage team members with role-based access control
- **Inbox Management**: Unified inbox for notifications and comments

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM, PostgreSQL, Redis
- **AI**: OpenAI GPT-4, Custom sentiment analysis
- **Auth**: NextAuth.js with OAuth providers
- **Testing**: Jest, React Testing Library
- **DevOps**: Docker, GitHub Actions CI/CD

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/ai-social-manager.git
   cd ai-social-manager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. Set up the database:
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

### Docker Setup

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- __tests__/lib/validators.test.ts
```

## Project Structure

```
src/
├── app/              # Next.js App Router
│   ├── api/          # API routes
│   └── (routes)/     # Page routes
├── components/       # React components
│   ├── analytics/    # Analytics components
│   ├── calendar/     # Calendar components
│   ├── compose/      # Post composer
│   ├── inbox/        # Inbox components
│   └── posts/        # Post components
├── lib/              # Utility libraries
│   ├── ai/           # AI services
│   ├── analytics/    # Analytics services
│   ├── integrations/ # Platform integrations
│   └── validators/   # Zod validators
└── types/            # TypeScript types

__tests__/            # Test files
├── api/              # API integration tests
├── components/       # Component tests
├── ai/               # AI service tests
├── analytics/        # Analytics tests
├── integrations/     # Integration tests
└── lib/              # Library tests
```

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET/POST /api/posts` - Manage posts
- `GET/POST /api/accounts` - Manage social accounts
- `GET/POST /api/campaigns` - Manage campaigns
- `GET /api/analytics` - Get analytics data

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.
