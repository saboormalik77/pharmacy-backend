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
      'Returns lets you create and track pharmaceutical product returns.\n\nTo create a return: Click "Create Return" in sidebar → Add items (scan/enter NDC, enter expiration) → System runs policy check (shows green/red/yellow banner) → Complete all items → Click "Complete" then "Finalize" to submit.\n\nNote: You cannot finalize if any item has TBD status — resolve those first from TBD Items page.\n\nReturn status flow: In Progress → Completed → Finalized → Received → Closed Out\n\nFrom the Returns page you can view all returns, see item breakdown, shipment tracking, and credit information.',
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
      'difference between', 'diff between', 'what is difference',
      'what is diff', 'compare tabs', 'tabs difference',
      'difference between all tabs', 'difference between sidebar tabs',
      'difference between portal tabs', 'what each tab does',
      'sidebar tabs explained', 'each section does',
      'returns vs credits', 'credits vs returns',
      'returns vs destruction', 'destruction vs returns',
      'returns vs wine cellar', 'wine cellar vs returns',
      'returns vs analytics & reports', 'analytics & reports vs returns',
      'returns vs tbd items', 'tbd items vs returns',
      'credits vs destruction', 'destruction vs credits',
      'credits vs analytics & reports', 'analytics & reports vs credits',
      'destruction vs analytics & reports', 'analytics & reports vs destruction',
      'destruction vs wine cellar', 'wine cellar vs destruction',
      'tbd items vs wine cellar', 'wine cellar vs tbd items',
      'tbd items vs analytics & reports', 'analytics & reports vs tbd',
      'tbd items vs credits', 'credits vs tbd items',
      'returns and credits difference', 'returns credits difference',
      'difference between my return and credit',
      'difference between return and credit tab',
    ],
    content:
      'Here is what each sidebar tab does:\n\n• Returns — Create and track return shipments (add items, finalize, track status)\n• TBD Items — Resolve items that need manual Returnable/Non-Returnable classification (blocks finalization until resolved)\n• Destruction — Registry for non-returnable items going to compliant disposal (scheduling and status tracking)\n• Wine Cellar — Hold products until manufacturer return window opens\n• On-Site Service — Request field representative visits (for returns, training, or inventory review)\n• Credits — View payments, payouts, fees, and download statements\n• Analytics & Reports — View charts and summaries of returns and activity\n• Branches — Manage multiple pharmacy locations (parent accounts only)\n• Roles & Permissions — Control staff access to different sections (parent accounts only)\n• Settings — Your profile, store details, license documents, and password',
    links: [
      { title: 'Returns', url: '/returns' },
      { title: 'Credits', url: '/credits' },
      { title: 'TBD Items', url: '/returns/tbd-items' },
      { title: 'Destruction', url: '/returns/destruction' },
      { title: 'Wine Cellar', url: '/wine-cellar' },
      { title: 'Analytics & Reports', url: '/analytics' },
      { title: 'Settings', url: '/settings' },
    ],
    suggestions: [
      'How do I create a return?',
      'How do credits work?',
      'What is the difference between TBD and Destruction?',
    ],
  },
  {
    keywords: [
      'difference between tbd and destruction',
      'diff between tbd and destruction',
      'tbd vs destruction',
      'tbd versus destruction',
      'tbd and destruction difference',
      'difference tbd destruction',
      'tbd or destruction',
      'what is difference tbd destruction',
    ],
    content:
      'TBD and Destruction are two different things in the portal:\n\nTBD (To Be Determined)\n• An item is TBD when the policy check could not determine if it is returnable or not\n• It is NOT yet classified — the decision is still pending\n• TBD items sit inside your return and block finalization until resolved\n• You resolve them from the TBD Items page by manually setting the status to Returnable or Non-Returnable\n\nDestruction\n• An item goes to Destruction when it has already been confirmed as Non-Returnable and you chose "Destruction" as the disposal route when adding it\n• The decision is fully made — the item will be disposed\n• Destruction items move to the separate Destruction page (a disposal registry, not part of the return)\n\nIn short:\nTBD = classification is unknown, needs a decision\nDestruction = classification is final (Non-Returnable), going to disposal',
    links: [
      { title: 'TBD Items', url: '/returns/tbd-items' },
      { title: 'Destruction', url: '/returns/destruction' },
    ],
    suggestions: [
      'How to resolve TBD items?',
      'What happens to non-returnable items?',
      'When does my item go to destruction?',
    ],
  },
  {
    keywords: [
      'tbd items', 'tbd item', 'what is tbd', 'what are tbd', 'about tbd',
      'to be determined', 'pending review', 'items review', 'tbd status',
      'resolve tbd', 'how to resolve tbd', 'tbd blocking', 'cannot finalize',
      'finalize blocked', 'why cant i finalize',
    ],
    content:
      'TBD Items (To Be Determined) are return items where the system could not automatically determine if they are returnable or not.\n\nA TBD item appears when the policy check returns a yellow banner and you did not manually select a status.\n\nImportant: You cannot finalize a return if it has any TBD items. Resolve them from the TBD Items page in the sidebar by setting the status to Returnable or Non-Returnable. If Non-Returnable, choose Wine Cellar or Destruction.',
    links: [{ title: 'TBD Items', url: '/returns/tbd-items' }],
    suggestions: [
      'What are TBD items?',
      'How to resolve TBD items?',
      'Why is my item marked as TBD?',
      'How do I finalize a return?',
    ],
  },
  {
    keywords: [
      'what happens non returnable', 'non returnable what happens', 'after non returnable',
      'non returnable item where', 'where does non returnable go', 'non returnable destination',
      'non returnable wine cellar', 'non returnable destruction', 'non returnable route',
      'what happens to non returnable', 'non returnable added', 'non returnable item added',
      'non returnable ends up', 'how non returnable wine cellar',
      'item go to destruction', 'when item destruction', 'send item to destruction',
      'item sent to destruction', 'item goes destruction', 'when does item go to destruction',
      'item go to wine cellar', 'item sent to wine cellar',
      'where non returnable', 'non returnable item show',
      'non returnable item portal', 'where non returnable item',
      'non returnable show', 'non returnable item',
    ],
    content:
      'When an item is classified as Non-Returnable in Add Items, the portal asks you to choose where it goes before saving:\n\n• Wine Cellar — The item is shelved and held for a future return when the manufacturer\'s return window opens\n• Destruction — The item is sent to the destruction registry for compliant pharmaceutical disposal\n\nOnce saved, the item does not stay in your regular return — it goes to the Wine Cellar or Destruction page depending on the route you selected.',
    links: [
      { title: 'Wine Cellar', url: '/wine-cellar' },
      { title: 'Destruction', url: '/returns/destruction' },
    ],
    suggestions: [
      'What is the Wine Cellar?',
      'What is the Destruction page?',
      'How do I know if a product is returnable?',
    ],
  },
  {
    keywords: [
      'destruction', 'destroy', 'disposal', 'destroy items', 'return destruction',
      'destruction page', 'destruction status', 'destruction registry',
    ],
    content:
      'The Destruction page (in the sidebar) is a registry of non-returnable items that are going through compliant pharmaceutical disposal.\n\nDestruction item statuses:\n• Pending — Awaiting scheduling\n• Scheduled — Destruction has been scheduled\n• Picked Up — Items have been picked up for destruction\n• Destroyed — Destruction is complete\n• Cancelled — The destruction record was cancelled\n\nThe page also shows details like destruction company, scheduled date, federal form, weight, and notes.',
    links: [{ title: 'Destruction', url: '/returns/destruction' }],
    suggestions: [
      'What happens to non-returnable items?',
      'What is the Wine Cellar?',
    ],
  },
  {
    keywords: [
      'wine cellar', 'wine-cellar', 'wine celler', 'wine sellor', 'wine seller',
      'wineceller', 'winecellar', 'archived items', 'archive', 'cellar',
      'shelved products', 'hold for return', 'future return', 'too early to return',
    ],
    content:
      'The Wine Cellar holds products that are shelved for future return when the manufacturer return window opens.\n\nItems go into the Wine Cellar when:\n• A product is too early to return — the policy window has not opened yet. The system shows a purple strip with the date the product becomes eligible and gives you the option to move it to the Wine Cellar to hold it until then.\n• A non-returnable item is held instead of being sent to destruction.\n\nWine Cellar page shows:\n• Items with status: Shelved, Ready to Return, Returned, or Destroyed\n• The expected returnable date for each item\n• The date it was shelved\n• Estimated value\n• Whether it is a partial quantity',
    links: [{ title: 'Wine Cellar', url: '/wine-cellar' }],
    suggestions: [
      'How does the policy check work?',
      'What happens to non-returnable items?',
      'How do I know if a product is returnable?',
    ],
  },
  {
    keywords: [
      'no tab', 'no sidebar', 'no tbd tab', 'no wine cellar tab', 'no credits tab',
      'no returns tab', 'no analytics tab', 'no destruction tab',
      'there is no tab', 'there is no tbd', 'there is no sidebar',
      'cant see sidebar', 'missing sidebar', 'tab not showing', 'tab missing',
      'sidebar not showing', 'cant see tab', 'cant access tab',
      'missing tab', 'tab not visible', 'tab hidden', 'sidebar permission',
      'cant see wine cellar', "can't see wine cellar", "can't see tab",
      'cant see returns', 'returns not showing', 'returns missing',
      'cant see credits', "can't see credits", 'credits not showing', 'credits missing',
      'cant see tbd', 'tbd not showing', 'tbd missing',
      'cant see destruction', 'destruction not showing', 'destruction missing',
      'cant see analytics', 'analytics not showing', 'analytics missing',
      'cant see branches', 'branches not showing', 'branches missing',
      'cant see roles', 'roles not showing', 'roles missing',
      'cant see settings', 'settings not showing', 'settings missing',
      'tab permission', 'sidebar access', 'sidebar permission',
      'why cant i see', 'why i cant see', "why can't i see", "why i can't see",
      'where is my tab', 'where is my sidebar',
    ],
    content:
      'If you cannot see a tab in the sidebar, your account may not have permission to access that section.\n\nContact your admin to enable the required permission for your role.',
    links: [
      { title: 'Roles & Permissions', url: '/roles-permissions' },
    ],
    suggestions: [
      'How do I manage roles and permissions?',
    ],
  },
  {
    keywords: [
      'credit', 'credits', 'expected credit', 'credit history', 'credit statement',
      'statement', 'credit value', 'credit breakdown', 'payment', 'payments',
    ],
    content:
      'Credits are earned when a return reaches "Closed Out" status.\n\nCredits page shows: Total Credits, Total Payout, Total Fees, Paid, Pending, and Payout Rate. Each payment record includes Date, Batch, Credit Received, Company Fee, GPO Share, Your Payout, Method, Reference, and Status.\n\nDownload your Credit Statement as CSV from the Credits page for bookkeeping and supplier reconciliation.',
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
      'Branches lets you manage multiple pharmacy locations under one parent account.\n\nGo to Branches → Click "Create Branch" → Fill in details → Assign staff and roles. Use Branch Switcher at the top to switch between locations.',
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
      'Roles & Permissions lets you control what your staff can access (parent accounts only).\n\nGo to Roles & Permissions → Click "Create Role" → Set permissions for each section (returns, credits, analytics, etc.) → Assign the role to staff from branch management.\n\nRoles define which pages and actions each staff member can access.',
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
      'Settings has three tabs:\n\n• Profile — Personal info, pharmacy name, NPI, DEA, license info, and upload DEA/license documents\n• Store Settings — Store number, wholesaler, GPO, DEA expiration, fax, store hours\n• Security — Change your password\n\nClick "Edit Profile" to modify information. Click "Save Changes" when done.',
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
      'To upload your State Pharmacy License: Go to Settings → Click "Edit Profile" → Scroll to "MY DOCUMENTS" → Click upload area under "State Pharmacy License" → Select file (PDF/image, max 10MB) → File uploads automatically → Click "Save Changes".',
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
      'To upload your DEA certificate: Go to Settings → Click "Edit Profile" → Scroll to "MY DOCUMENTS" → Click upload area under "DEA Certificate" → Select file (PDF/image, max 10MB) → File uploads automatically → Click "Save Changes".',
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
      'To change your password: Go to Settings → Click "Security" tab → Enter current password → Enter new password → Confirm new password → Click "Update Password".\n\nIf you forgot your password, use the "Forgot Password" link on the login page.',
    links: [{ title: 'Settings', url: '/settings' }],
    suggestions: [
      'How to update my profile?',
      'How to change my email?',
    ],
  },
  {
    keywords: [
      'return status', 'what does status mean', 'status meaning',
      'in progress status', 'completed status', 'finalized status',
      'received status', 'closed out status', 'paused status',
      'what is in progress', 'what is finalized', 'what is closed out',
      'what does in progress mean', 'what does finalized mean',
    ],
    content:
      'Return status meanings:\n\n• In Progress — Building the return; can add/edit items\n• Paused — Temporarily paused; can resume\n• Completed — Ready to be finalized\n• Finalized — Submitted; manifest available; no longer editable\n• Received — Warehouse has received shipment\n• Closed Out — Processing complete; credits applied',
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
      'To view or download Credit Statement: Go to Credits → Click "Credit Statement" or Statement tab → View itemized breakdown → Use download/export option to save as PDF or spreadsheet.\n\nThe statement shows every credit line item linked to its original return.',
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
      'To create a branch (parent/admin accounts only): Go to Branches → Click "Create Branch" → Fill in branch name, NPI, address, phone → Click Save → Open the branch and assign staff and roles.\n\nBranches let you manage multiple pharmacy locations under one parent account. Use Branch Switcher at the top to switch between locations.',
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
      'To assign a role to staff: Go to Branches → Open the branch → Find staff member → Click their name or edit icon → Select role from dropdown → Save.\n\nIf the role does not exist, first create it in Roles & Permissions.',
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
      'To update your profile: Go to Settings → Click "Edit Profile" → Edit any field (name, email, phone, pharmacy name, NPI, DEA, license info, address) → Click "Save Changes".\n\nNote: DEA expiration and wholesaler info are in "Store Settings" tab, not Profile.',
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
      'To update store hours: Go to Settings → Click "Store Settings" tab → Click "Edit" → Find "Store Hours" field and enter your hours (e.g., M–F 9am–6pm, Sat 10am–3pm) → Click "Save Changes".\n\nStore hours are stored as free text in any format.',
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
      'To log out: Click your name or avatar in top-right corner → Click "Sign Out" or "Logout".\n\nThis ends your session and returns you to the login page.',
    links: [],
    suggestions: [
      'How to change my password?',
      'How to update my profile?',
    ],
  },
  {
    keywords: [
      'history', 'chat history', 'previous chat', 'old messages', 'conversation history',
      'chat log', 'past conversations', 'save chat', 'my history',
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
      'which items return', 'what can i return',
      'how do i know if a product is returnable',
      'how do i know if product is returnable',
      'how to check if product is returnable',
      'how to check if a product is returnable',
      'is my product returnable', 'check product eligibility', 'product returnable',
      'how to know returnable', 'returnable check',
      'policy check', 'check policy', 'product return policy',
      'item returnable or not', 'item returnable', 'returnable or not',
      'know item returnable', 'know returnable', 'check returnable',
      'how know returnable or not', 'item is returnable',
    ],
    content:
      'The system automatically checks if a product is returnable when you add it to a return.\n\nIt shows a colored banner:\n• Green — Returnable (status locked)\n• Red — Non-Returnable (status locked)\n• Yellow — No policy found; you must select the status manually (can become TBD)\n\nClick "View Policy" for full details. If a product is too early to return, a purple strip shows the eligible date and offers to move it to Wine Cellar.',
    links: [
      { title: 'Create Return', url: '/returns/create' },
      { title: 'All Returns', url: '/returns' },
    ],
    suggestions: [
      'What does the green/red/yellow banner mean?',
      'What happens to non-returnable items?',
      'What is the Wine Cellar?',
      'What are TBD items?',
    ],
  },
  {
    keywords: [
      'track return', 'where is my return', 'return tracking', 'check return status',
      'find my return', 'return progress',
    ],
    content:
      'To track a return: Go to Returns → Find your return (search or scroll) → Click to open detail page → View status, item list, shipment tracking, and credit info.\n\nStatus bar shows: Draft → Ready to Ship → In Transit → Processing → Completed.',
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
      'Getting started:\n\n1. Settings — Complete your profile, NPI, DEA, and license info\n2. Returns — Create your first return from the sidebar\n3. Credits — Monitor credits from closed-out returns\n4. Analytics & Reports — Track performance\n5. Branches — Set up multiple locations (if applicable)\n6. Roles & Permissions — Control staff access',
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
  {
    keywords: [
      'what is on-site service', 'what is onsite service', 'what is on site service',
      'tell me about on-site service', 'tell me about onsite',
      'about on-site service', 'about onsite service',
      'on-site service tab', 'onsite tab', 'onsite service tab',
      'explain on-site service', 'explain onsite service',
      'know about on-site service', 'know about onsite',
    ],
    content:
      'On-Site Service lets you request a field representative to visit your pharmacy.\n\nHow it works: Submit request with preferred date → Automatically routed to all assigned reps → First rep to claim it schedules the visit → You receive email confirmation.\n\nStatuses: Pending (waiting for rep) → Scheduled (confirmed date) → Completed (visit done) → Cancelled\n\nYou can only cancel "Pending" requests. Once scheduled, contact the rep directly to reschedule.',
    links: [
      { title: 'On-Site Service', url: '/on-site-service' },
      { title: 'Request New Visit', url: '/on-site-service/new' },
    ],
    suggestions: [
      'How do I request a field rep visit?',
      'How do I cancel a service request?',
      'Can I see rep contact information?',
    ],
  },
  {
    keywords: [
      'request on-site service', 'request onsite', 'request field rep',
      'schedule on-site service', 'schedule field rep',
      'create service request', 'submit service request',
      'how to request on-site', 'how to request visit',
      'how do i request on-site service', 'how do i request field rep',
      'how do i request visit', 'how to request field rep',
      'how request field rep', 'book rep visit', 'how book rep visit',
      'request rep visit', 'request a visit',
    ],
    content:
      'To request a field rep visit: Go to On-Site Service → Click "New Request" → Choose preferred date → Add special instructions (optional) → Submit.\n\nRequest is automatically routed to all assigned reps. First rep to claim it will schedule and email you.',
    links: [
      { title: 'On-Site Service', url: '/on-site-service' },
      { title: 'Request New Visit', url: '/on-site-service/new' },
    ],
    suggestions: [
      'What is On-Site Service?',
      'How do I cancel a service request?',
    ],
  },
  {
    keywords: [
      'cancel service request', 'cancel on-site service', 'cancel field rep',
      'cancel visit', 'cancel rep visit', 'stop service request',
      'how cancel service request', 'how cancel on-site',
      'how do i cancel service request', 'how to cancel service request',
      'how do i cancel on-site service', 'how to cancel on-site service',
      'how cancel visit', 'how do i cancel visit', 'how to cancel visit',
      'cancel my service request', 'cancel my visit',
    ],
    content:
      'To cancel a service request: Go to On-Site Service → Open request → Click "Cancel Request" → Provide reason (optional).\n\nOnly "Pending" requests can be cancelled. Once scheduled, contact the rep directly.',
    links: [
      { title: 'On-Site Service', url: '/on-site-service' },
    ],
    suggestions: [
      'What is On-Site Service?',
      'How do I request a field rep visit?',
    ],
  },
  {
    keywords: [
      'rep contact', 'rep email', 'rep phone', 'rep information',
      'field rep contact', 'field representative contact',
      'contact field rep', 'call field rep', 'email field rep',
      'who is my rep', 'my field rep', 'assigned rep',
      'how to contact rep', 'how do i contact rep',
      'see rep contact', 'view rep contact', 'get rep contact',
      'how to see rep info', 'how see rep information',
    ],
    content:
      'To see rep contact info: Go to On-Site Service → Open a scheduled request → View rep details (name, email, phone).\n\nRep contact info only appears once a rep has claimed and scheduled your request.',
    links: [
      { title: 'On-Site Service', url: '/on-site-service' },
    ],
    suggestions: [
      'What is On-Site Service?',
      'How do I request a field rep visit?',
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
    // Deduplicate fuzzy pairs across ALL keywords of this entry so that an entry
    // with many keywords containing the same word doesn't get inflated score.
    const matchedFuzzyPairs = new Set<string>();

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

      // Fuzzy match: each unique (queryWord, keywordWord) pair counted only once per entry
      const keywordWords = lowerKeyword.split(/\s+/).filter((w) => w.length >= 4 && !STOP_WORDS.has(w));
      queryWords.forEach((qWord) => {
        keywordWords.forEach((kWord) => {
          const pair = `${qWord}:${kWord}`;
          if (!matchedFuzzyPairs.has(pair) && isFuzzyMatch(qWord, kWord)) {
            matchedFuzzyPairs.add(pair);
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
