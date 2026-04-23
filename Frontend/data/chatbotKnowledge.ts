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
      'returns page', 'create return', 'return medication', 'return process',
      'return item', 'how returns work', 'return overview', 'return flow',
      'pharmaceutical return', 'submit return', 'returns feature',
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
      'tbd items', 'tbd item', 'what is tbd', 'what are tbd', 'about tbd',
      'to be determined', 'pending review', 'items review', 'tbd status',
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
      'settings page', 'profile settings', 'account settings', 'store settings',
      'settings overview', 'what is settings', 'tell me about settings',
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
  // ── Specific sub-topic items (targeted answers for precise questions) ──

  {
    keywords: [
      'upload license document', 'upload state license', 'upload pharmacy license',
      'state pharmacy license upload', 'license document upload', 'how to upload license',
    ],
    content:
      'To upload your State Pharmacy License document:\n1. Go to Settings from the sidebar\n2. Click "Edit Profile" to enter edit mode\n3. Scroll down to the "MY DOCUMENTS" section\n4. Click the upload area under "State Pharmacy License"\n5. Select your file (PDF, image, etc. — max 10MB)\n6. The file uploads automatically\n7. Click "Save Changes"\n\nThe uploaded document link is saved to your profile and can be viewed anytime from the same section.',
    links: [{ title: 'Settings', url: '/settings' }],
    suggestions: [
      'How to upload a DEA document?',
      'How to update my license expiration date?',
      'How to view uploaded documents?',
    ],
  },
  {
    keywords: [
      'upload dea document', 'upload dea certificate', 'dea document upload',
      'how to upload dea', 'dea file upload', 'dea certificate upload',
    ],
    content:
      'To upload your DEA certificate document:\n1. Go to Settings from the sidebar\n2. Click "Edit Profile" to enter edit mode\n3. Scroll down to the "MY DOCUMENTS" section\n4. Click the upload area under "DEA Certificate"\n5. Select your file (PDF, image, etc. — max 10MB)\n6. The file uploads automatically\n7. Click "Save Changes"\n\nThe DEA document is saved to your profile and accessible anytime from Settings.',
    links: [{ title: 'Settings', url: '/settings' }],
    suggestions: [
      'How to upload a State Pharmacy License document?',
      'How to update my DEA number?',
    ],
  },
  {
    keywords: [
      'change password', 'update password', 'reset password', 'new password',
      'how to change password', 'password change',
    ],
    content:
      'To change your password:\n1. Go to Settings from the sidebar\n2. Click the "Security" tab (third tab)\n3. Enter your current password\n4. Enter your new password\n5. Confirm the new password\n6. Click "Update Password"\n\nIf you have forgotten your password, use the "Forgot Password" link on the login page instead.',
    links: [{ title: 'Settings', url: '/settings' }],
    suggestions: [
      'How to update my profile?',
      'How to change my email?',
    ],
  },
  {
    keywords: [
      'return status', 'what does status mean', 'status meaning', 'draft status',
      'ready to ship status', 'in transit status', 'processing status', 'completed status',
      'what is draft', 'what is processing', 'what is in transit',
    ],
    content:
      'Return status meanings:\n\n• Draft — The return has been created but not yet submitted. You can still add or remove items. No action needed by the warehouse yet.\n\n• Ready to Ship — You have submitted the return. Pack the items and ship them using the provided label. The return is waiting on your shipment.\n\n• In Transit — The shipment has been sent and is on its way to the warehouse. Tracking is active.\n\n• Processing — The warehouse has received your items and is verifying them against the return manifest. This may take 1–3 business days.\n\n• Completed — All items have been verified. Credits have been calculated and applied to your account.',
    links: [{ title: 'All Returns', url: '/returns' }],
    suggestions: [
      'How do I create a return?',
      'What are TBD items?',
      'How do credits get calculated?',
    ],
  },
  {
    keywords: [
      'view credit statement', 'download statement', 'credit statement download',
      'how to get statement', 'print statement', 'export credits',
    ],
    content:
      'To view or download your Credit Statement:\n1. Go to Credits from the sidebar\n2. Click the "Credit Statement" option or navigate to the Statement tab\n3. You can view the full itemized breakdown of all credits\n4. Use the download/export option to save it as a PDF or spreadsheet\n\nThe statement shows every credit line item linked to its original return, useful for bookkeeping and supplier reconciliation.',
    links: [
      { title: 'Credits', url: '/credits' },
      { title: 'Credit Statement', url: '/credits/statement' },
    ],
    suggestions: [
      'What is the difference between expected and received credits?',
      'How are credits calculated?',
    ],
  },
  {
    keywords: [
      'create branch', 'add branch', 'add location', 'new branch', 'add pharmacy location',
      'how to create branch', 'how to add branch',
    ],
    content:
      'To create a new branch (available to parent/admin accounts only):\n1. Go to Branches from the sidebar\n2. Click "Create Branch"\n3. Fill in: branch name, NPI number, physical address, and contact phone\n4. Click Save to create the branch\n5. Once created, open the branch and assign staff members and their roles\n\nBranches let you manage multiple pharmacy locations under one parent account. Each branch has its own staff and data.',
    links: [{ title: 'Branches', url: '/branches' }],
    suggestions: [
      'How to switch between branches?',
      'How to assign staff to a branch?',
      'How to create a role?',
    ],
  },
  {
    keywords: [
      'assign role', 'give permission', 'assign permission', 'staff permission',
      'how to assign role', 'set staff access', 'user access',
    ],
    content:
      'To assign a role to a staff member:\n1. Go to Branches in the sidebar\n2. Open the branch where the staff member works\n3. Find the staff member in the list\n4. Click on their name or the edit icon\n5. Select the role you want to assign from the dropdown\n6. Save\n\nIf the role you need does not exist yet, first go to Roles & Permissions to create it, then come back to assign it.',
    links: [
      { title: 'Branches', url: '/branches' },
      { title: 'Roles & Permissions', url: '/roles' },
    ],
    suggestions: [
      'How to create a custom role?',
      'What permissions can I set?',
    ],
  },
  {
    keywords: [
      'update profile', 'edit profile', 'change name', 'change email', 'change phone',
      'update pharmacy name', 'update npi', 'update dea number', 'edit my info',
    ],
    content:
      'To update your profile information:\n1. Go to Settings from the sidebar\n2. Click the "Edit Profile" button at the top right\n3. Edit any of the following: full name, email, phone, pharmacy/facility name, NPI number, DEA number, state license number, license expiration, corporate name, mailing address\n4. Click "Save Changes" when done\n\nNote: DEA expiration and wholesaler information are edited under the "Store Settings" tab, not the Profile tab.',
    links: [{ title: 'Settings', url: '/settings' }],
    suggestions: [
      'How to upload license documents?',
      'How to update store hours?',
      'How to change my password?',
    ],
  },
  {
    keywords: [
      'update store hours', 'change store hours', 'store hours', 'operating hours',
      'set store hours', 'edit store hours',
    ],
    content:
      'To update your store hours:\n1. Go to Settings from the sidebar\n2. Click the "Store Settings" tab (second tab)\n3. Click "Edit" to enter edit mode\n4. Find the "Store Hours" field and enter your hours (e.g., M–F 9am–6pm, Sat 10am–3pm)\n5. Click "Save Changes"\n\nStore hours are stored as free text so you can enter any format that suits your pharmacy.',
    links: [{ title: 'Settings', url: '/settings' }],
    suggestions: [
      'How to update my wholesaler?',
      'How to update DEA expiration?',
    ],
  },

  {
    keywords: [
      'logout', 'log out', 'sign out', 'signout', 'how to logout', 'exit portal', 'end session',
    ],
    content:
      'To log out of the portal:\n1. Click on your name or avatar in the top-right corner of the page\n2. Click "Sign Out" or "Logout" from the dropdown menu\n\nThis will end your session and take you back to the login page.',
    links: [],
    suggestions: [
      'How to change my password?',
      'How to update my profile?',
    ],
  },
  {
    keywords: [
      'chat history', 'previous chat', 'old messages', 'conversation history',
      'chat log', 'past conversations', 'save chat',
    ],
    content:
      'Chat history is only available during your current session. Once you close the chat window or refresh the page, previous messages are cleared.\n\nThis assistant does not store or save conversation history between sessions. If you need to reference an answer later, we recommend copying the text before closing the chat.',
    links: [],
    suggestions: [
      'How do I create a return?',
      'How do credits work?',
    ],
  },
  {
    keywords: [
      'what items can be returned', 'eligible items', 'return eligibility',
      'which items return', 'returnable items', 'what can i return',
    ],
    content:
      'Items eligible for return typically include:\n• Expired pharmaceutical products\n• Products expiring soon\n• Damaged items\n• Overstocked medications\n\nEligibility depends on the product type, condition, and your agreements with the supplier/distributor. Not all items qualify for full credit.\n\nTo check, go to Create Return and search for the item — the system will indicate if it can be added to a return.',
    links: [
      { title: 'Create Return', url: '/returns/create' },
    ],
    suggestions: [
      'How do I create a return?',
      'How are credits calculated?',
    ],
  },
  {
    keywords: [
      'track return', 'where is my return', 'return tracking', 'check return status',
      'find my return', 'return progress',
    ],
    content:
      'To track a return:\n1. Go to Returns in the sidebar\n2. Find your return in the list (use search or scroll)\n3. Click on it to open the detail page\n4. You will see the current status, item list, shipment tracking, and credit information\n\nThe status bar at the top shows exactly where your return is in the process: Draft → Ready to Ship → In Transit → Processing → Completed.',
    links: [{ title: 'All Returns', url: '/returns' }],
    suggestions: [
      'What do the return statuses mean?',
      'How do credits get calculated?',
    ],
  },

  // ── General items ──

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

// Common filler words to ignore during matching
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'because', 'but', 'and', 'or', 'if', 'while', 'about', 'what', 'which',
  'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'it', 'its',
  'my', 'me', 'i', 'you', 'your', 'we', 'our', 'they', 'them', 'their',
  'tell', 'show', 'please', 'want', 'like', 'know', 'get', 'got',
]);

// Levenshtein distance for typo detection
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

function isFuzzyMatch(queryWord: string, keywordWord: string): boolean {
  if (queryWord.length < 4 || keywordWord.length < 4) return queryWord === keywordWord;
  const maxEdits = queryWord.length <= 5 ? 1 : 2;
  return levenshtein(queryWord, keywordWord) <= maxEdits;
}

// Extract meaningful words from a string (no stop words, min 3 chars)
function extractMeaningfulWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

export function findRelevantKnowledge(query: string): KnowledgeItem[] {
  const lowerQuery = query.toLowerCase();
  const queryWords = extractMeaningfulWords(query);
  const matches: Array<{ item: KnowledgeItem; score: number }> = [];

  if (queryWords.length === 0) return [];

  chatbotKnowledge.forEach((item) => {
    let score = 0;

    item.keywords.forEach((keyword) => {
      const lowerKeyword = keyword.toLowerCase();

      // Multi-word keyword phrase found in the query (strong signal, high score)
      if (keyword.includes(' ') && lowerQuery.includes(lowerKeyword)) {
        score += keyword.split(' ').length * 5;
        return;
      }

      // Single keyword exact match in query (must be non-stop-word, min 3 chars)
      if (!keyword.includes(' ') && lowerKeyword.length >= 3 && !STOP_WORDS.has(lowerKeyword)) {
        // Use word-boundary check to avoid partial matches (e.g. "log" inside "logout")
        const wordBoundaryRegex = new RegExp(`\\b${lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        if (wordBoundaryRegex.test(lowerQuery)) {
          score += lowerKeyword.length >= 4 ? 3 : 2;
          return;
        }
      }

      // Fuzzy match: only for meaningful query words against meaningful keyword words
      const keywordWords = lowerKeyword.split(/\s+/).filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
      queryWords.forEach((qWord) => {
        keywordWords.forEach((kWord) => {
          if (isFuzzyMatch(qWord, kWord)) {
            score += 2;
          }
        });
      });
    });

    // Only accept if score is meaningful (avoids weak single-word false positives)
    if (score >= 3) {
      matches.push({ item, score });
    }
  });

  // If top match is way stronger than second, return only the top one (specific answer)
  const sorted = matches.sort((a, b) => b.score - a.score);
  if (sorted.length >= 2 && sorted[0].score >= sorted[1].score * 2) {
    return [sorted[0].item];
  }

  return sorted.slice(0, 3).map((m) => m.item);
}
