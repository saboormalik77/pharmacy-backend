# Cron Job Scripts

## Expiring Products Check

This script checks for expiring pharmacy inventory items and sends notifications.

### Features

- Finds products that are expired OR expiring within next 30 days
- Skips items that already have notifications (no duplicates)
- Creates in-app notifications with saved pricing data
- Sends email summaries to pharmacies

### Usage

#### Option 1: Using npm script (Recommended)
```bash
npm run cron:expiring-products
```

#### Option 2: Using ts-node directly
```bash
ts-node src/scripts/runExpiringProductsCheck.ts
```

#### Option 3: Using compiled JavaScript
```bash
# First build the project
npm run build

# Then run the compiled script
node dist/scripts/runExpiringProductsCheck.js
```

### Scheduling

#### Linux/Mac Cron (crontab)
```bash
# Edit crontab
crontab -e

# Add this line to run every 10 minutes
*/10 * * * * cd /path/to/pharmacy-backend && npm run cron:expiring-products >> /var/log/expiring-products-cron.log 2>&1
```

#### Windows Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: "Daily" or "When the computer starts"
4. Set action: "Start a program"
5. Program: `node`
6. Arguments: `src/scripts/runExpiringProductsCheck.js`
7. Start in: `C:\path\to\pharmacy-backend`

#### PM2 (Process Manager)
```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
# Then run: pm2 start ecosystem.config.js
```

#### Docker Cron
```dockerfile
# Add to Dockerfile
RUN echo "*/10 * * * * node /app/dist/scripts/runExpiringProductsCheck.js" | crontab -
```

### Programmatic Usage

You can also import and call the function programmatically:

```typescript
import { checkExpiringProductsAndNotify } from '../services/notificationCronService';

// Call the function
const result = await checkExpiringProductsAndNotify();
console.log(result);
```

### Environment Variables

Make sure these are set in your `.env.local` or environment:

```env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
SMTP_HOST=your-email-host
SMTP_USER=your-email-user
SMTP_PASS=your-email-password
FRONTEND_URL=https://your-frontend-url.com
```

### Output

The script outputs:
- Number of pharmacies processed
- Number of notifications created
- Number of emails sent
- Any errors encountered

Exit codes:
- `0` = Success
- `1` = Error

### Logging

Logs are printed to stdout/stderr. Redirect to a file for production:

```bash
npm run cron:expiring-products >> /var/log/cron.log 2>&1
```

