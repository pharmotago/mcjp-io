-- 1. Create Helper Function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
  emp_id UUID;
  emp_role TEXT;
BEGIN
  -- Get user role and employee_id
  SELECT role, employee_id INTO user_role, emp_id 
  FROM public.brisk_users 
  WHERE id = auth.uid() 
  LIMIT 1;
  
  -- If user is owner or manager, return that role
  IF user_role IN ('owner', 'manager') THEN
    RETURN user_role;
  END IF;

  -- Otherwise, check the employee's role/position
  IF emp_id IS NOT NULL THEN
    SELECT role INTO emp_role 
    FROM public.brisk_employees 
    WHERE id = emp_id 
    LIMIT 1;
    
    IF emp_role = 'Pharmacist Manager' THEN
      RETURN 'manager';
    END IF;
  END IF;

  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.brisk_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brisk_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brisk_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brisk_timecards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brisk_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brisk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brisk_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid duplication conflicts
DROP POLICY IF EXISTS "Users can read all user records" ON public.brisk_users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.brisk_users;
DROP POLICY IF EXISTS "Managers can insert user records" ON public.brisk_users;
DROP POLICY IF EXISTS "Managers can update any user record" ON public.brisk_users;

DROP POLICY IF EXISTS "Users can read all active employees" ON public.brisk_employees;
DROP POLICY IF EXISTS "Managers can modify employees" ON public.brisk_employees;

DROP POLICY IF EXISTS "Users can read all shifts" ON public.brisk_shifts;
DROP POLICY IF EXISTS "Managers can modify shifts" ON public.brisk_shifts;

DROP POLICY IF EXISTS "Users can read timecards" ON public.brisk_timecards;
DROP POLICY IF EXISTS "Employees can insert their own timecards" ON public.brisk_timecards;
DROP POLICY IF EXISTS "Employees can update their own timecards" ON public.brisk_timecards;
DROP POLICY IF EXISTS "Managers can modify all timecards" ON public.brisk_timecards;

DROP POLICY IF EXISTS "Users can read leave requests" ON public.brisk_leave_requests;
DROP POLICY IF EXISTS "Employees can insert/modify their own leave requests" ON public.brisk_leave_requests;
DROP POLICY IF EXISTS "Managers can modify all leave requests" ON public.brisk_leave_requests;

DROP POLICY IF EXISTS "Users can read settings" ON public.brisk_settings;
DROP POLICY IF EXISTS "Managers can modify settings" ON public.brisk_settings;

DROP POLICY IF EXISTS "Anyone can read invitations by code" ON public.brisk_invitations;
DROP POLICY IF EXISTS "Managers can modify invitations" ON public.brisk_invitations;

-- Create Policies
-- ==========================================
-- brisk_users
-- ==========================================
CREATE POLICY "Users can read all user records" 
ON public.brisk_users FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Users can update their own record" 
ON public.brisk_users FOR UPDATE TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Managers can insert user records" 
ON public.brisk_users FOR INSERT TO authenticated 
WITH CHECK (public.get_current_user_role() IN ('manager', 'owner'));

CREATE POLICY "Managers can update any user record" 
ON public.brisk_users FOR UPDATE TO authenticated 
USING (public.get_current_user_role() IN ('manager', 'owner'));

-- ==========================================
-- brisk_employees
-- ==========================================
CREATE POLICY "Users can read all active employees" 
ON public.brisk_employees FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Managers can modify employees" 
ON public.brisk_employees FOR ALL TO authenticated 
USING (public.get_current_user_role() IN ('manager', 'owner'));

-- ==========================================
-- brisk_shifts
-- ==========================================
CREATE POLICY "Users can read all shifts" 
ON public.brisk_shifts FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Managers can modify shifts" 
ON public.brisk_shifts FOR ALL TO authenticated 
USING (public.get_current_user_role() IN ('manager', 'owner'));

-- ==========================================
-- brisk_timecards
-- ==========================================
CREATE POLICY "Users can read timecards" 
ON public.brisk_timecards FOR SELECT TO authenticated 
USING (
  public.get_current_user_role() IN ('manager', 'owner') OR
  employee_id = (SELECT employee_id FROM public.brisk_users WHERE id = auth.uid())
);

CREATE POLICY "Employees can insert their own timecards" 
ON public.brisk_timecards FOR INSERT TO authenticated 
WITH CHECK (
  employee_id = (SELECT employee_id FROM public.brisk_users WHERE id = auth.uid())
);

CREATE POLICY "Employees can update their own timecards" 
ON public.brisk_timecards FOR UPDATE TO authenticated 
USING (
  employee_id = (SELECT employee_id FROM public.brisk_users WHERE id = auth.uid())
) WITH CHECK (
  employee_id = (SELECT employee_id FROM public.brisk_users WHERE id = auth.uid())
);

CREATE POLICY "Managers can modify all timecards" 
ON public.brisk_timecards FOR ALL TO authenticated 
USING (public.get_current_user_role() IN ('manager', 'owner'));

-- ==========================================
-- brisk_leave_requests
-- ==========================================
CREATE POLICY "Users can read leave requests" 
ON public.brisk_leave_requests FOR SELECT TO authenticated 
USING (
  public.get_current_user_role() IN ('manager', 'owner') OR
  employee_id = (SELECT employee_id FROM public.brisk_users WHERE id = auth.uid())
);

CREATE POLICY "Employees can insert/modify their own leave requests" 
ON public.brisk_leave_requests FOR ALL TO authenticated 
USING (
  employee_id = (SELECT employee_id FROM public.brisk_users WHERE id = auth.uid())
);

CREATE POLICY "Managers can modify all leave requests" 
ON public.brisk_leave_requests FOR ALL TO authenticated 
USING (public.get_current_user_role() IN ('manager', 'owner'));

-- ==========================================
-- brisk_settings
-- ==========================================
CREATE POLICY "Users can read settings" 
ON public.brisk_settings FOR SELECT TO authenticated 
USING (true);

CREATE POLICY "Managers can modify settings" 
ON public.brisk_settings FOR ALL TO authenticated 
USING (public.get_current_user_role() IN ('manager', 'owner'));

-- ==========================================
-- brisk_invitations
-- ==========================================
CREATE POLICY "Anyone can read invitations by code" 
ON public.brisk_invitations FOR SELECT TO public 
USING (used = false);

CREATE POLICY "Managers can modify invitations" 
ON public.brisk_invitations FOR ALL TO authenticated 
USING (public.get_current_user_role() IN ('manager', 'owner'));
