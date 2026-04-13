-- Fix Main Admin Password Hash
-- This updates the existing user with the correct password hash

UPDATE public.main_admin 
SET password_hash = '$2a$10$nUp.QSi3vZNDWYPyTPxjz.1eywyR2DOKKi9P7IjFiyUiCowQ9321C',
    updated_at = NOW()
WHERE email = 'mainadmin@pharmadmin.com';

-- Verify the update
SELECT 
  id,
  email, 
  name,
  is_active,
  substring(password_hash, 1, 20) || '...' as password_hash_preview,
  updated_at
FROM public.main_admin 
WHERE email = 'mainadmin@pharmadmin.com';