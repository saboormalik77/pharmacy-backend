// Knowledge base for the pharmacy portal chatbot
// Only covers features that are currently active in the sidebar/portal

export interface KnowledgeItem {
  keywords: string[];
  content: string;
  links: Array<{ title: string; url: string }>;
  suggestions?: string[];
}

export const chatbotKnowledge: KnowledgeItem[] = [
  {
    keywords: [
      'return', 'returns', 'create return', 'return medication', 'return process',
      'return item', 'return status', 'return reason', 'draft', 'ready to ship',
      'in transit', 'processing', 'completed return',
    ],
    content:
      'Returns is the core feature of the portal. You can create, submit, and track pharmaceutical product returns from start to finish.\n\nHow to create a return:\n1. Click "Create Return" in the sidebar\n2. Scan barcodes or manually search for items to include\n3. Review the item list and confirm quantities\n4. Submit the return\n\nReturn status flow:\nDraft → Ready to Ship → In Transit → Processing → Completed\n\nEach status means:\n• Draft — Being built, not yet submitted\n• Ready to Ship — Confirmed, waiting for you to pack and ship\n• In Transit — Shipped, tracking is active\n• Processing — Warehouse is verifying your items\n• Completed — Done, credits have been applied\n\nFrom the Returns page you can view all returns, open any return for full details, see the item breakdown, shipment tracking, and expected credits.',
    links: [
      { title: 'All Returns', url: '/returns' },
      { title: 'Create New Return', url: '/returns/create' },
    ],
    suggestions: [
      'How do I create a return?',
      'What are the return status stages?',
      'How to track a return?',
      'What items can be returned?',
    ],
  },
  {
    keywords: [
      'tbd', 'tbd items', 'to be determined', 'pending review', 'items review',
    ],
    content:
      'TBD Items (To Be Determined) are return items that require additional review before they can be processed.\n\nThese items are held separately until a decision is made on whether they are eligible for credit or need to be handled differently.\n\nYou can view and manage TBD items from the TBD Items page in the sidebar.',
    links: [{ title: 'TBD Items', url: '/returns/tbd-items' }],
    suggestions: [
      'What are TBD items?',
      'How to resolve TBD items?',
      'Why is my item marked as TBD?',
    ],
  },
  {
    keywords: [
      'destruction', 'destroy', 'disposal', 'destroy items', 'return destruction',
    ],
    content:
      'Destruction refers to return items that have been approved for proper pharmaceutical disposal rather than credit.\n\nThese items go through a compliant destruction process. You can view destruction items and their status from the Destruction page in the sidebar.',
    links: [{ title: 'Destruction', url: '/returns/destruction' }],
    suggestions: [
      'What is the destruction process?',
      'How are items approved for destruction?',
      'How to view destruction items?',
    ],
  },
  {
    keywords: [
      'wine cellar', 'wine-cellar', 'wine celler', 'wine sellor', 'wine seller',
      'wineceller', 'winecellar', 'archived items', 'archive', 'cellar',
    ],
    content:
      'The Wine Cellar is a specialized section within the portal for managing certain pharmaceutical items that are held or archived separately from the regular returns workflow.\n\nItems in the Wine Cellar may be there because they:\n• Require additional review or special handling\n• Are being held pending further instructions\n• Are archived for record-keeping purposes\n\nYou can access the Wine Cellar directly from the sidebar if your account has the required permission (wine_cellar:view). If you do not see it in your sidebar, contact your admin to enable the permission for your role.',
    links: [{ title: 'Wine Cellar', url: '/wine-cellar' }],
    suggestions: [
      'What is the Wine Cellar?',
      'How to access the Wine Cellar?',
      'Why can\'t I see the Wine Cellar in my sidebar?',
    ],
  },
  {
    keywords: [
      'credit', 'credits', 'expected credit', 'credit history', 'credit statement',
      'statement', 'credit value', 'credit breakdown', 'payment', 'payments',
    ],
    content:
      'Credits are earned from items verified in your completed returns.\n\nHow credits work:\n• When a return reaches "Completed" status, each eligible item is assigned a credit value based on product type and condition\n• "Expected Credits" — credits that have been calculated but not yet paid out\n• "Received Credits" — credits that have been confirmed and paid by the supplier\n• Every credit entry is linked back to the original return item for full traceability\n• Credits are issued by the supplier/distributor after warehouse confirmation\n\nThe Credit Statement gives you a full itemized financial record — useful for bookkeeping, audits, and reconciliation with suppliers.\n\nGo to Credits in the sidebar to view your full credit history and download your statement.',
    links: [
      { title: 'Credits', url: '/credits' },
      { title: 'Credit Statement', url: '/credits/statement' },
    ],
    suggestions: [
      'How are credits calculated?',
      'How to view my credit history?',
      'How to download a credit statement?',
      'When will I receive credit?',
    ],
  },
  {
    keywords: [
      'analytics', 'reports', 'statistics', 'dashboard', 'data', 'charts',
      'insights', 'analytics reports', 'performance',
    ],
    content:
      'Analytics & Reports gives you insights into your operations:\n• Return statistics and trends\n• Credit and financial performance summaries\n• Activity breakdowns by time period\n\nGo to Analytics & Reports from the sidebar to view charts, summaries, and exportable reports.',
    links: [{ title: 'Analytics & Reports', url: '/analytics' }],
    suggestions: [
      'What analytics are available?',
      'How to view return trends?',
      'How to export a report?',
    ],
  },
  {
    keywords: [
      'branch', 'branches', 'location', 'multiple locations', 'pharmacy branch',
      'create branch', 'branch management', 'add location',
    ],
    content:
      'Branches lets you manage multiple pharmacy locations under one parent account.\n\nHow to create a branch:\n1. Go to Branches in the sidebar (visible to parent accounts only)\n2. Click "Create Branch"\n3. Fill in branch name, NPI, address, and contact details\n4. Assign staff and roles to the branch\n\nYou can switch between branches using the Branch Switcher at the top of the page.',
    links: [{ title: 'Branches', url: '/branches' }],
    suggestions: [
      'How to create a branch?',
      'How to switch between branches?',
      'How to assign staff to a branch?',
    ],
  },
  {
    keywords: [
      'role', 'roles', 'permission', 'permissions', 'access control',
      'staff access', 'user role', 'create role', 'manage roles',
    ],
    content:
      'Roles & Permissions lets you control what your staff can access.\n\nHow to manage roles:\n1. Go to Roles & Permissions in the sidebar (parent accounts only)\n2. Click "Create Role"\n3. Set permissions for each section (returns, credits, analytics, etc.)\n4. Assign the role to staff members from the branch management\n\nRoles define exactly which pages and actions each staff member can access.',
    links: [{ title: 'Roles & Permissions', url: '/roles' }],
    suggestions: [
      'How to create a custom role?',
      'How to change user permissions?',
      'How to restrict staff access?',
    ],
  },
  {
    keywords: [
      'settings', 'profile', 'account', 'store settings', 'store hours',
      'corporate name', 'mailing address', 'password', 'change password',
      'dea number', 'license number', 'upload document', 'profile settings',
      'npi', 'pharmacy name', 'facility name', 'contact info',
    ],
    content:
      'Settings lets you manage all your pharmacy account information. It has three tabs:\n\n1. Profile Tab:\n   • Personal info: name, email, phone\n   • Pharmacy/facility name, NPI number, corporate name\n   • DEA number, state license number, license expiration date\n   • Mailing address (if different from physical address)\n   • Upload DEA certificate and State Pharmacy License documents\n\n2. Store Settings Tab:\n   • Store number, service type, buying group/GPO affiliation\n   • Primary and secondary wholesaler, wholesale account number\n   • DEA expiration date, days between visits\n   • Fax number and store operating hours\n\n3. Security Tab:\n   • Change your account password\n   • Enter current password and set a new one\n\nTo edit your profile, click the "Edit Profile" button on the Settings page. Click "Save Changes" when done.',
    links: [{ title: 'Settings', url: '/settings' }],
    suggestions: [
      'How to update my profile?',
      'How to change my password?',
      'How to upload license documents?',
      'How to update store hours?',
    ],
  },
  {
    keywords: [
      'support', 'help', 'contact', 'issue', 'problem', 'report', 'assistance',
    ],
    content:
      'Need help?\n\n• Use this chat assistant for questions about portal features\n• For technical issues or bugs, contact our support team directly\n• If you see an error or something is not working, note the page and what action you were taking when reporting the issue',
    links: [{ title: 'Settings', url: '/settings' }],
    suggestions: [
      'How to report a bug?',
      'How to contact support?',
    ],
  },
  {
    keywords: [
      'get started', 'new user', 'onboarding', 'setup', 'first time', 'welcome', 'how to use',
    ],
    content:
      'Getting started with the pharmacy portal:\n\n1. Settings — Complete your profile, NPI, DEA number, and license info first\n2. Returns — Create your first return by clicking "Create Return" in the sidebar\n3. Credits — Monitor credits earned from your returns\n4. Analytics & Reports — Track your performance\n5. Branches — If you manage multiple locations, set them up under Branches\n6. Roles & Permissions — Control what your staff can access',
    links: [
      { title: 'Settings', url: '/settings' },
      { title: 'Returns', url: '/returns' },
      { title: 'Credits', url: '/credits' },
    ],
    suggestions: [
      'How do I create my first return?',
      'How to complete my profile setup?',
      'How to manage staff access?',
    ],
  },
];

// Levenshtein distance for fuzzy/typo-tolerant matching
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Check if two words are "close enough" (handles typos up to 2 edits for longer words)
function isFuzzyMatch(queryWord: string, keyword: string): boolean {
  if (queryWord.length < 3) return queryWord === keyword;
  const maxEdits = queryWord.length <= 5 ? 1 : 2;
  return levenshtein(queryWord, keyword) <= maxEdits;
}

// Find relevant knowledge items based on user query (exact + fuzzy matching)
export function findRelevantKnowledge(query: string): KnowledgeItem[] {
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length >= 3);
  const matches: Array<{ item: KnowledgeItem; score: number }> = [];

  chatbotKnowledge.forEach((item) => {
    let score = 0;

    item.keywords.forEach((keyword) => {
      const lowerKeyword = keyword.toLowerCase();

      // Exact substring match (highest score — weight by word count)
      if (lowerQuery.includes(lowerKeyword)) {
        score += keyword.split(' ').length * 3;
        return;
      }

      // Fuzzy word-level match — each query word checked against each keyword word
      const keywordWords = lowerKeyword.split(/\s+/);
      queryWords.forEach((qWord) => {
        keywordWords.forEach((kWord) => {
          if (kWord.length >= 3 && isFuzzyMatch(qWord, kWord)) {
            score += 1;
          }
        });
      });
    });

    if (score > 0) {
      matches.push({ item, score });
    }
  });

  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((m) => m.item);
}
