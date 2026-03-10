// Knowledge base for the chatbot with website information and links

export interface KnowledgeItem {
  keywords: string[];
  content: string;
  links: Array<{ title: string; url: string }>;
  suggestions?: string[];
}

export const chatbotKnowledge: KnowledgeItem[] = [
  {
    keywords: ['inventory', 'stock', 'add inventory', 'manage inventory', 'inventory management', 'add stock', 'stock entry'],
    content: 'Inventory Management is your central hub for tracking pharmaceutical stock. You can: 1) Add items manually by entering an NDC code, 2) Import bulk inventory via CSV or Excel files, 3) View all items with their expiration dates, quantities, and locations, 4) Monitor items expiring within 180 days, 5) Manage expired medications by creating packages for warehouse disposal. The system automatically calculates days until expiration and categorizes items as active, expiring soon, or expired. You can search by product name, NDC, or lot number, and filter by status.',
    links: [
      { title: 'View All Inventory', url: '/inventory' },
      { title: 'Add New Stock', url: '/inventory?view=add' },
      { title: 'Expired Medications', url: '/inventory?view=expired' },
      { title: 'Inventory Overview', url: '/inventory?view=overview' },
    ],
    suggestions: [
      'How do I add inventory items manually?',
      'How to import inventory from CSV?',
      'How to find expired medications?',
      'What does "expiring soon" mean?',
    ],
  },
  {
    keywords: ['return', 'returns', 'create return', 'return medication', 'return process', 'return item'],
    content: 'Returns Management enables you to create and track returns of pharmaceutical products. To create a return: 1) Go to Create Return page, 2) Select items from your available inventory, 3) Specify return reasons (expired, damaged, expiring soon, etc.), 4) Review estimated credits, 5) Submit the return. The system tracks returns through stages: Draft → Ready to Ship → In Transit → Processing → Completed. You can view return details, shipment information, chain of custody, and estimated credits. Returns are linked to shipments for tracking.',
    links: [
      { title: 'All Returns', url: '/returns' },
      { title: 'Create New Return', url: '/returns/create' },
    ],
    suggestions: [
      'How do I create a return?',
      'What items are eligible for return?',
      'How to track a return status?',
      'What are return reasons?',
    ],
  },
  {
    keywords: ['shipment', 'shipments', 'track shipment', 'shipping', 'delivery'],
    content: 'Shipments Management tracks all your return shipments. You can view shipment status, tracking numbers, carrier information, and delivery confirmations. The system provides real-time updates on shipment progress.',
    links: [
      { title: 'Shipments', url: '/shipments' },
    ],
    suggestions: [
      'How to track a shipment?',
      'What carriers are supported?',
      'How to create a shipment label?',
    ],
  },
  {
    keywords: ['warehouse', 'receiving', 'warehouse receiving', 'package', 'packages', 'expired package', 'disposal'],
    content: 'Warehouse Operations include: 1) Receiving - When packages arrive, warehouse staff receive and inspect them, checking condition and integrity, 2) Classification - Items are classified as returnable (for credit) or non-returnable (for destruction), 3) Processing - Warehouse orders track the complete lifecycle from receiving to completion, 4) Expired Medication Packages - You can create packages of expired items from your inventory and send them to the warehouse for FDA-compliant disposal. The system tracks quality checks, compliance checks, and provides detailed timelines.',
    links: [
      { title: 'Warehouse Receiving', url: '/warehouse/receiving' },
      { title: 'Warehouse Orders', url: '/warehouse/orders' },
      { title: 'Create Expired Package', url: '/warehouse/packages/create' },
    ],
    suggestions: [
      'How does warehouse receiving work?',
      'How to create an expired medication package?',
      'What is the warehouse order timeline?',
      'What are quality and compliance checks?',
    ],
  },
  {
    keywords: ['payment', 'payments', 'credit', 'credits', 'expected credit', 'received payment'],
    content: 'Payments & Credits tracks expected credits from returns and received payments from suppliers. You can view payment history, expected credits, commission calculations, and financial analytics. The system provides detailed breakdowns of payment status and credit estimates.',
    links: [
      { title: 'Payments', url: '/payments' },
      { title: 'Credits', url: '/credits' },
    ],
    suggestions: [
      'How are credits calculated?',
      'When will I receive payment?',
      'How to view payment history?',
    ],
  },
  {
    keywords: ['marketplace', 'buy', 'sell', 'purchase', 'products'],
    content: 'Marketplace allows you to browse and purchase pharmaceutical products from suppliers. You can search by NDC, view product details, compare prices, and place orders directly through the platform.',
    links: [
      { title: 'Marketplace', url: '/marketplace' },
    ],
    suggestions: [
      'How to search for products?',
      'How to place an order?',
      'What suppliers are available?',
    ],
  },
  {
    keywords: ['analytics', 'reports', 'statistics', 'dashboard', 'data'],
    content: 'Analytics provides comprehensive insights into your operations including inventory trends, return statistics, financial performance, and operational metrics. You can view charts, graphs, and detailed reports to make data-driven decisions.',
    links: [
      { title: 'Analytics', url: '/analytics' },
      { title: 'Dashboard', url: '/dashboard' },
    ],
    suggestions: [
      'What analytics are available?',
      'How to view inventory trends?',
      'How to export reports?',
    ],
  },
  {
    keywords: ['expired', 'expiration', 'expiring soon', 'expired medication', 'disposal'],
    content: 'Expired medications must be properly packaged and sent to authorized warehouse facilities for destruction per FDA regulations (21 CFR Part 1317). You can view expired items in the inventory, select them, and create packages for warehouse disposal. The system tracks the entire disposal process.',
    links: [
      { title: 'Expired Items', url: '/inventory?view=expired' },
      { title: 'Create Package', url: '/warehouse/packages/create' },
    ],
    suggestions: [
      'How to handle expired medications?',
      'What is the FDA compliance process?',
      'How to create a disposal package?',
    ],
  },
  {
    keywords: ['ndc', 'national drug code', 'product code', 'lookup'],
    content: 'NDC (National Drug Code) is a unique identifier for pharmaceutical products. You can search and validate NDCs in the inventory system. The system automatically looks up product information including name, manufacturer, strength, and dosage form when you enter an NDC.',
    links: [
      { title: 'Add Inventory', url: '/inventory?view=add' },
    ],
    suggestions: [
      'How to lookup an NDC?',
      'What is an NDC format?',
      'How to validate an NDC?',
    ],
  },
  {
    keywords: ['help', 'support', 'assistance', 'how to', 'guide'],
    content: 'I\'m here to help you navigate the pharmacy management system! I can assist with inventory management, returns, shipments, warehouse operations, payments, and more. Feel free to ask me any questions about using the system.',
    links: [
      { title: 'Dashboard', url: '/dashboard' },
      { title: 'Settings', url: '/settings' },
    ],
    suggestions: [
      'How do I get started?',
      'What features are available?',
      'How to contact support?',
    ],
  },
];

// Helper function to find relevant knowledge based on user query
export function findRelevantKnowledge(query: string): KnowledgeItem[] {
  const lowerQuery = query.toLowerCase();
  const matches: Array<{ item: KnowledgeItem; score: number }> = [];

  chatbotKnowledge.forEach((item) => {
    let score = 0;
    item.keywords.forEach((keyword) => {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        score += 1;
      }
    });
    if (score > 0) {
      matches.push({ item, score });
    }
  });

  // Sort by score and return top matches
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((m) => m.item);
}

