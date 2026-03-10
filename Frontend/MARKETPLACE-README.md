# Marketplace - Deal of the Day Feature

## 📋 Overview

This is a standalone HTML/CSS/JavaScript prototype of the **Marketplace - Deal of the Day** feature for the PharmAnalytics platform. It provides a comprehensive pharmaceutical procurement interface where pharmacies can discover and purchase discounted pharmaceutical products.

## 🎯 Features Implemented

### ✅ Core Features

1. **Deal of the Day Hero Section**
   - Large, prominent product display with gradient background
   - Animated "Deal of the Day" badge with pulse effect
   - Large discount badge (circular, animated)
   - Product information (name, NDC, manufacturer, strength)
   - Pricing display (original vs. discounted)
   - Real-time countdown timer
   - Availability progress bar with color coding
   - Minimum order requirement display
   - Product specifications (expiry date, lot number, package size)
   - Call-to-action buttons (Add to Cart, View Details)

2. **Past Deals Grid**
   - Responsive grid layout (3-4 columns on desktop)
   - Compact deal cards with essential information
   - Discount badges and expiry indicators
   - Availability bars with color-coded urgency
   - Quick add to cart functionality
   - Sorting and filtering controls

3. **Shopping Cart Drawer**
   - Slide-in drawer from the right
   - Cart item management (quantity update, remove)
   - Real-time cart summary
   - Pricing breakdown (subtotal, savings, tax, shipping)
   - Continue shopping and checkout options
   - Empty cart state

4. **Deal Detail Modal**
   - Full-screen modal with product details
   - Image gallery with thumbnails
   - Complete product information
   - Pricing breakdown
   - Quantity selector with validation
   - Deal terms and conditions
   - Regulatory information
   - Add to cart with validation

5. **Interactive Elements**
   - Toast notifications for user feedback
   - Countdown timer (updates every second)
   - Hover effects and animations
   - Smooth transitions
   - Keyboard shortcuts (ESC to close, Ctrl+K for cart)

### 🎨 Design System

**Color Palette:**
- Primary: Teal (#0d9488) and Cyan (#0891b2)
- Accent: Emerald (#059669) for pricing and success
- Alert: Red (#ef4444) and Orange (#f97316) for deals and urgency
- Neutrals: Gray scale from 50 to 900

**Typography:**
- Font Family: Inter (with system font fallback)
- Heading: Bold, 700-800 weight
- Body: Regular, 400-500 weight
- Code/NDC: Monospace (Courier New)

**Spacing:**
- Consistent Tailwind-style spacing scale
- Generous padding in hero section (2rem)
- Card padding: 1.25rem
- Button padding: 0.75rem - 1rem

**Effects:**
- Box shadows: sm, md, lg, xl, 2xl
- Border radius: 0.375rem - 1rem
- Transitions: 0.2s - 0.5s ease
- Animations: pulse, fadeIn, slideIn, zoomIn

## 📁 File Structure

```
pharma-collect-ui/
├── marketplace-prototype.html    # Main HTML file
├── marketplace-styles.css        # Complete CSS styling
├── marketplace-script.js         # JavaScript functionality
└── MARKETPLACE-README.md         # This documentation
```

## 🚀 Getting Started

### Option 1: Direct File Opening
1. Navigate to the project directory
2. Open `marketplace-prototype.html` in your web browser
3. That's it! No server or build process required

### Option 2: Local Server (Recommended)
```bash
# Using Python 3
cd /path/to/pharma-collect-ui
python3 -m http.server 8000

# Using Node.js (npx)
npx http-server -p 8000

# Using PHP
php -S localhost:8000
```

Then open: `http://localhost:8000/marketplace-prototype.html`

## 🎮 User Interactions

### Navigation
- **Sidebar**: Click menu items to navigate (active state on Marketplace)
- **Cart Icon**: Click to open shopping cart drawer
- **User Menu**: Displays current user information

### Deal of the Day Section
- **Add to Cart**: Adds product to cart (minimum order validation)
- **View Details**: Opens detailed modal with full product information
- **Countdown Timer**: Live countdown showing deal urgency
- **Availability Bar**: Visual indicator of stock levels

### Past Deals
- **Sort Dropdown**: Change sorting order (newest, expiring soon, highest discount, etc.)
- **Filters Button**: Apply filters (placeholder for now)
- **Deal Cards**: 
  - Hover for elevation effect
  - Click "Add to Cart" for quick purchase
  - Click eye icon for detailed view
- **Load More**: Load additional deals (simulated)

### Shopping Cart
- **Open**: Click cart icon in nav or press Ctrl+K
- **Close**: Click X, overlay, or press ESC
- **Quantity**: Use +/- buttons or type directly
- **Remove**: Click trash icon on item
- **Checkout**: Click "Proceed to Checkout" button

### Deal Modal
- **Open**: Click "View Details" on any deal
- **Close**: Click X, overlay, or press ESC
- **Image Gallery**: Click thumbnails to change main image
- **Quantity**: Adjust with +/- buttons (validates min/max)
- **Add to Cart**: Validates and adds to cart

### Keyboard Shortcuts
- `ESC`: Close modal or drawer
- `Ctrl+K` (or `Cmd+K`): Toggle cart drawer

## 🎯 Responsive Breakpoints

```css
Desktop:  > 1024px  (Full layout)
Tablet:   640px - 1024px  (Sidebar 200px, 2 deal columns)
Mobile:   < 768px  (No sidebar, single column, stacked layout)
Small:    < 480px  (Optimized for small screens)
```

## 🔧 JavaScript Features

### Core Functions

**Cart Management:**
- `toggleCart()` - Open/close cart drawer
- `updateQuantity(itemId, change)` - Update item quantity
- `removeFromCart(itemId)` - Remove item from cart
- `updateCartBadge()` - Update cart item count
- `updateCartTotals()` - Recalculate cart totals

**Modal Management:**
- `openDealModal()` - Open deal details modal
- `closeDealModal()` - Close deal details modal
- `updateModalQuantity(change)` - Adjust quantity in modal
- `addModalToCart()` - Add modal item to cart

**Notifications:**
- `showToast(message, type)` - Display toast notification
- `showAddToCartNotification()` - Success notification for cart

**Timer:**
- `initCountdownTimer()` - Initialize and run countdown timer

**Validation:**
- `validateMinimumOrder(quantity, minimum)` - Check minimum order
- `validateStockAvailability(quantity, available)` - Check stock

**Utilities:**
- `debounce(func, wait)` - Debounce function calls
- `throttle(func, limit)` - Throttle function calls
- `formatPrice(price)` - Format currency display

### Initialization
All features are automatically initialized on `DOMContentLoaded`:
- Countdown timer starts automatically
- Scroll animations setup
- Image gallery listeners
- Form validations
- Keyboard shortcuts
- Accessibility features

## 🎨 Customization

### Colors
Edit CSS variables in `marketplace-styles.css`:

```css
:root {
    --primary-teal: #0d9488;
    --primary-cyan: #0891b2;
    --emerald: #059669;
    /* ... more colors ... */
}
```

### Countdown Timer
Modify in `marketplace-script.js`:

```javascript
function initCountdownTimer() {
    const dealEndTime = new Date();
    dealEndTime.setHours(dealEndTime.getHours() + 4); // Change duration
    // ...
}
```

### Product Data
Replace placeholder data in HTML with dynamic data:

```html
<!-- Example: Deal of the Day product -->
<h2 class="deal-product-name">Your Product Name</h2>
<span class="ndc-code">NDC: YOUR-NDC-CODE</span>
<!-- Update pricing, availability, etc. -->
```

## 📊 API Integration Points

For production integration, replace these areas:

### 1. Deal Data Loading
```javascript
// GET /api/marketplace/deals/deal-of-the-day
async function loadDealOfTheDay() {
    const response = await fetch('/api/marketplace/deals/deal-of-the-day');
    const deal = await response.json();
    // Render deal...
}
```

### 2. Past Deals
```javascript
// GET /api/marketplace/deals?filter=active&page=1
async function loadDeals(page = 1, filters = {}) {
    const params = new URLSearchParams({ page, ...filters });
    const response = await fetch(`/api/marketplace/deals?${params}`);
    const deals = await response.json();
    // Render deals...
}
```

### 3. Add to Cart
```javascript
// POST /api/marketplace/cart/add
async function addToCart(dealId, quantity) {
    const response = await fetch('/api/marketplace/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, quantity })
    });
    return response.json();
}
```

### 4. Cart Operations
```javascript
// GET /api/marketplace/cart
// PUT /api/marketplace/cart/update
// DELETE /api/marketplace/cart/remove/:id
```

### 5. Checkout
```javascript
// POST /api/marketplace/orders
async function checkout(orderData) {
    const response = await fetch('/api/marketplace/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
    });
    return response.json();
}
```

## ♿ Accessibility Features

- **Keyboard Navigation**: All interactive elements accessible via Tab
- **ARIA Labels**: Proper labeling for screen readers
- **Focus Management**: Visible focus indicators and focus trapping in modals
- **Color Contrast**: WCAG 2.1 AA compliant (4.5:1 minimum)
- **Alt Text**: All images have descriptive alt attributes
- **Semantic HTML**: Proper heading hierarchy and landmarks

## 🎭 Animations & Transitions

**Implemented Animations:**
- Pulse animation on "Deal of the Day" badge
- Slide-in for cart drawer (from right)
- Zoom-in for modal
- Fade-in for overlays
- Bounce for cart icon on add
- Blink for urgent expiry badges
- Smooth progress bar fills
- Card hover elevations
- Slide-out for removed items

**Performance:**
- All animations use CSS transforms (GPU accelerated)
- Debounced scroll listeners
- Throttled resize handlers
- Lazy loading for images
- Intersection Observer for scroll animations

## 📱 Mobile Optimization

- Touch-friendly buttons (min 44x44px)
- Swipe gestures supported (native)
- Responsive images
- Optimized font sizes
- Collapsible sections
- Bottom-aligned CTAs for thumb reach
- Hamburger menu (auto-generated)

## 🧪 Testing Checklist

### Functional Testing
- [ ] Countdown timer updates every second
- [ ] Cart badge updates on add/remove
- [ ] Quantity validation (min/max)
- [ ] Modal opens and closes properly
- [ ] Cart drawer opens and closes
- [ ] Toast notifications appear/disappear
- [ ] Image gallery thumbnails work
- [ ] Sort dropdown triggers changes
- [ ] Load more button works
- [ ] Remove from cart works

### Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Responsive Testing
- [ ] Desktop (1920px)
- [ ] Laptop (1366px)
- [ ] Tablet (768px)
- [ ] Mobile (375px)
- [ ] Small mobile (320px)

### Accessibility Testing
- [ ] Keyboard-only navigation
- [ ] Screen reader compatibility
- [ ] Color contrast (use tools like WAVE)
- [ ] Focus indicators visible
- [ ] No keyboard traps

## 🐛 Known Limitations

1. **Static Data**: All product data is hardcoded (needs API integration)
2. **No Backend**: Cart persists only in localStorage
3. **Placeholder Functions**: Some functions log to console (need implementation)
4. **No Authentication**: User menu is static
5. **No Real Payments**: Checkout is placeholder
6. **No Search**: Search functionality not implemented
7. **Limited Filters**: Filter button is placeholder

## 🚧 Future Enhancements

### Phase 1 Improvements
- [ ] Integrate with real API endpoints
- [ ] Add authentication flow
- [ ] Implement search functionality
- [ ] Add advanced filters (price range, category, manufacturer)
- [ ] Real-time stock updates via WebSocket
- [ ] Email notifications for deals

### Phase 2 Features
- [ ] Wishlist/Favorites
- [ ] Deal recommendations (personalized)
- [ ] Comparison tool
- [ ] Bulk order management
- [ ] Order history
- [ ] Saved payment methods

### Phase 3 Advanced
- [ ] A/B testing framework
- [ ] Analytics dashboard integration
- [ ] Push notifications
- [ ] Progressive Web App (PWA)
- [ ] Offline mode
- [ ] Multi-language support

## 📝 Code Quality

**Best Practices Implemented:**
- Semantic HTML5 elements
- CSS custom properties for theming
- BEM-like naming convention for CSS classes
- Modular JavaScript functions
- Event delegation where appropriate
- Debouncing and throttling for performance
- Accessibility-first approach
- Mobile-first responsive design

**Performance Optimizations:**
- CSS animations use transforms (GPU)
- Images lazy loaded
- Intersection Observer for scroll effects
- LocalStorage for cart persistence
- Minimal reflows and repaints
- Efficient selectors

## 🤝 Integration with Next.js

To integrate this prototype into your Next.js app:

1. **Convert HTML to React Component:**
   ```jsx
   // app/(dashboard)/marketplace/page.tsx
   export default function MarketplacePage() {
     return (
       // Copy HTML structure here
     );
   }
   ```

2. **Convert CSS to Module or Tailwind:**
   ```css
   /* Use existing Tailwind classes or import CSS module */
   ```

3. **Convert JavaScript to React Hooks:**
   ```jsx
   import { useState, useEffect } from 'react';
   
   const [cartItems, setCartItems] = useState([]);
   const [isCartOpen, setIsCartOpen] = useState(false);
   ```

4. **Replace Static Data with API Calls:**
   ```jsx
   const { data: deals } = useSWR('/api/marketplace/deals', fetcher);
   ```

5. **Add State Management (Zustand/Context):**
   ```jsx
   const useCartStore = create((set) => ({
     items: [],
     addItem: (item) => set((state) => ({
       items: [...state.items, item]
     })),
   }));
   ```

## 📞 Support

For questions or issues with this prototype:
1. Review this README thoroughly
2. Check browser console for errors
3. Verify all files are in the same directory
4. Test in different browsers

## 📄 License

This prototype is part of the PharmAnalytics platform and follows the project's licensing terms.

---

**Version:** 1.0.0  
**Last Updated:** December 30, 2025  
**Author:** PharmAnalytics Development Team  
**Status:** Prototype (Ready for Review)

