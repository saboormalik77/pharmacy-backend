# Updated Buying Groups to Show Only Super Admin Role

## Changes Made

The MainAdmin `/buying-groups` route now only shows and manages admin records with `role = 'super_admin'`.

### Modified RPC Functions

All the following functions in `scripts/rpcFunctions/main_admin_functions.sql` were updated to filter by `role = 'super_admin'`:

1. **`get_buying_groups_list`**:
   - Stats query now filters: `FROM admin a WHERE a.role = 'super_admin'`
   - Count query now filters: `WHERE a.role = 'super_admin' AND ...`
   - Main fetch query now filters: `WHERE a.role = 'super_admin' AND ...`

2. **`get_buying_group_by_id`**:
   - Now filters: `WHERE a.id = p_group_id AND a.role = 'super_admin'`

3. **`create_buying_group`**:
   - Already creates records with `role = 'super_admin'` (no change needed)

4. **`update_buying_group`**:
   - Now filters: `WHERE id = p_group_id AND role = 'super_admin'`

5. **`delete_buying_group`**:
   - Check now filters: `WHERE id = p_group_id AND role = 'super_admin'`
   - Delete now filters: `WHERE id = p_group_id AND role = 'super_admin'`

## What This Means

- MainAdmin will only see admin records with `role = 'super_admin'` in the buying groups list
- Only super_admin role records can be viewed, edited, or deleted through the buying groups interface
- New buying groups are created as `role = 'super_admin'` records (this was already happening)
- Regular admin records (other roles) are not accessible through the MainAdmin buying groups interface

## To Apply Changes

Run this SQL file against your database:
```bash
psql "$DATABASE_URL" -f scripts/rpcFunctions/main_admin_functions.sql
```

## Testing

You can check current admin roles with:
```bash
psql "$DATABASE_URL" -f scripts/check_super_admin_roles.sql
```