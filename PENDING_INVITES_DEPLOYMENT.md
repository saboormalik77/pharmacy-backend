# Pending Invites Feature Deployment Guide

## Overview
This feature adds the ability to view and cancel pending pharmacy invitations in the admin panel.

## Changes Made

### 1. Backend API Endpoints

#### New Controller Functions (`src/controllers/adminPharmaciesController.ts`)
- `getPendingInvitesHandler` - GET `/api/admin/pharmacies/invites`
- `cancelInviteHandler` - DELETE `/api/admin/pharmacies/invites/:id`

#### New Routes (`src/routes/adminPharmaciesRoutes.ts`)
- Added routes for fetching and canceling invites

### 2. Frontend Redux Store

#### Updated Pharmacies Slice (`admin/lib/store/pharmaciesSlice.ts`)
- Added `fetchPendingInvites` async thunk
- Added `cancelInvite` async thunk
- Extended state to include:
  - `pendingInvites: any[]`
  - `invitesLoading: boolean`
  - `invitesError: string | null`

### 3. Admin UI Updates

#### Enhanced Pharmacies Page (`admin/app/pharmacies/page.tsx`)
- Added "Pending Invitations" section with collapsible view
- Shows invite details: pharmacy name, email, contact, sent date, expiry
- Cancel invite functionality with confirmation modal
- Visual indicators for expiring invites (< 24 hours)

## Testing the Feature

### 1. Start the Application
```bash
# Backend
cd /home/saboor.malik@2bvision.com/2bvt/pharmacy-backend
npm run dev

# Admin Panel
cd admin
npm run dev
```

### 2. Test Backend Endpoints

#### Get Pending Invites
```bash
curl -X GET "http://localhost:3000/api/admin/pharmacies/invites" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

#### Cancel an Invite
```bash
curl -X DELETE "http://localhost:3000/api/admin/pharmacies/invites/INVITE_ID" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Test Admin UI

1. **Login to Admin Panel**: Go to `http://localhost:3001` and login as admin
2. **Navigate to Pharmacies**: Go to Admin → Pharmacies
3. **Create a Test Invite**: 
   - Click "Add Pharmacy" 
   - Fill in required details
   - Click "Create & Send Invite"
4. **View Pending Invites**:
   - Look for "Pending Invitations" section
   - Click "Show Invites" to expand
   - Verify the new invite appears in the list
5. **Cancel an Invite**:
   - Click the trash icon next to an invite
   - Confirm cancellation in the modal
   - Verify the invite is removed from the list

## Database Schema

The feature uses the existing `pharmacy_invites` table:
- Fetches invites with `status = 'pending'` and `expires_at > NOW()`
- Cancellation sets `status = 'expired'` and `completed_at = NOW()`

## Key Features

### Visual Indicators
- **Badge**: Shows count of pending invites
- **Expiry Warning**: Orange text for invites expiring within 24 hours
- **Loading States**: Spinners during API calls
- **Error Handling**: User-friendly error messages

### User Experience
- **Collapsible Section**: Keeps the main pharmacy list uncluttered
- **Confirmation Modal**: Prevents accidental cancellations
- **Real-time Updates**: List refreshes after actions
- **Responsive Design**: Works on different screen sizes

## Security Notes

- Only authenticated admin users can access invite endpoints
- Cancellation requires confirmation to prevent accidents
- Expired invites are automatically filtered out
- All API calls include proper error handling

## Troubleshooting

### Common Issues

1. **Invites not showing**: Check if invites exist and haven't expired
2. **Cancel not working**: Verify admin authentication token
3. **UI not updating**: Check browser console for JavaScript errors

### Debug Steps

1. Check browser network tab for API call responses
2. Verify admin authentication status
3. Check backend logs for error messages
4. Confirm database has pending invites with correct status

## Future Enhancements

Potential improvements for this feature:
- Resend invite functionality
- Bulk cancel operations
- Invite expiry date modification
- Email notification on cancellation
- Invite usage analytics