# PharmReverse - Reverse Distributor Platform

A comprehensive web-based SaaS platform for pharmacy reverse distributors to manage pharmaceutical returns, credits, and an integrated B2B marketplace.

## Features

- 🔐 **Authentication** - Login and multi-step registration wizard
- 📊 **Dashboard** - Overview of returns, credits, and shipments with stats
- 📦 **Returns Management** - Create, track, and manage pharmaceutical returns
- 🚚 **Shipment Tracking** - Real-time tracking of shipments with timeline
- 💰 **Credits & Payments** - Track expected and received credits with aging reports
- 🛒 **Marketplace** - B2B marketplace for buying and selling pharmaceutical inventory
- 📈 **Analytics** - Insights and reports on returns performance and ROI

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **UI Components**: Custom components built with Tailwind

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables (optional - for chatbot):
```bash
# Copy the example file
cp env.example .env.local

# Edit .env.local and add your Azure OpenAI credentials
# See CHATBOT_CREDENTIALS.md for detailed instructions
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Chatbot Setup (Optional)

The application includes an AI-powered chatbot that helps users navigate the system. To enable full AI capabilities:

1. Create an Azure OpenAI resource in Azure Portal
2. Copy `env.example` to `.env.local`
3. Add your Azure OpenAI credentials (see `CHATBOT_CREDENTIALS.md` for details)
4. The chatbot will work in fallback mode without credentials, but with Azure OpenAI it provides more intelligent responses

**Security Note**: All credentials are stored server-side only and never exposed to the client. See `CHATBOT_CREDENTIALS.md` for security details.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
├── app/
│   ├── (auth)/              # Authentication pages
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/         # Main application pages
│   │   ├── dashboard/       # Main dashboard
│   │   ├── returns/         # Returns management
│   │   ├── shipments/       # Shipment tracking
│   │   ├── credits/         # Credits & payments
│   │   ├── marketplace/     # B2B marketplace
│   │   └── analytics/       # Reports & analytics
│   ├── globals.css          # Global styles
│   └── layout.tsx           # Root layout
├── components/
│   ├── ui/                  # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   └── StatCard.tsx
│   └── layout/              # Layout components
│       ├── DashboardLayout.tsx
│       ├── Sidebar.tsx
│       └── TopBar.tsx
├── data/                    # Mock data
│   ├── mockClients.ts
│   ├── mockReturns.ts
│   ├── mockShipments.ts
│   ├── mockCredits.ts
│   ├── mockMarketplace.ts
│   └── mockUsers.ts
├── lib/
│   └── utils/               # Utility functions
│       ├── cn.ts           # Class name utility
│       └── format.ts       # Formatting utilities
└── types/
    └── index.ts            # TypeScript type definitions
```

## Features Overview

### Authentication
- Login page with email/password
- 3-step registration wizard
  - Step 1: Basic pharmacy information (NPI, DEA)
  - Step 2: Contact details
  - Step 3: Review & account setup

### Dashboard
- Quick stats cards (returns, credits, shipments)
- Quick action buttons for common tasks
- Recent returns activity feed
- Upcoming payments timeline

### Returns Management
- List view with filtering and search
- Detailed return view with:
  - Status timeline
  - Item table with NDC, lot, expiration
  - Shipment information
  - Estimated credits
- Status tracking: Draft → Ready to Ship → In Transit → Processing → Completed

### Shipment Tracking
- Track shipments across multiple carriers (UPS, FedEx, USPS)
- Real-time tracking timeline with location updates
- Integration with returns

### Credits & Payments
- Track expected vs actual credits
- Variance tracking
- Aging reports
- Payment timeline

### Marketplace
- Browse pharmaceutical listings
- Product details with pricing, expiration, location
- Seller ratings
- Shopping cart functionality (UI only)

### Analytics
- KPI cards (total returns, completion rate, ROI)
- Top returned drugs
- Manufacturer performance metrics
- ROI analysis

## Mock Data

The application uses mock data for demonstration purposes. All data is stored in the `/data` directory:

- **Users**: Demo credentials work with any email/password
- **Returns**: 5 sample returns with various statuses
- **Shipments**: 3 shipments with tracking history
- **Credits**: 5 credit transactions
- **Marketplace**: 3 active listings

## Next Steps

To move from mock UI to production:

1. **Backend Integration**
   - Replace mock data with API calls
   - Implement authentication with JWT/sessions
   - Set up database (PostgreSQL, MongoDB, etc.)

2. **State Management**
   - Add React Query for data fetching
   - Add Zustand for global state

3. **Additional Features**
   - Real-time updates with WebSocket
   - File upload for documents and photos
   - PDF generation for labels and reports
   - Email notifications
   - Advanced search and filtering

4. **Testing**
   - Add unit tests (Jest, Vitest)
   - Add E2E tests (Playwright, Cypress)
   - Add accessibility tests

5. **Production Deployment**
   - Set up environment variables
   - Configure production build
   - Deploy to Vercel/AWS/GCP

## License

Proprietary - All rights reserved

## Support

For support, contact the development team or refer to the CLAUDE.md file for Claude Code assistance.
# pharma-collect-ui
