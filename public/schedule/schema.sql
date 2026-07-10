-- Amcal Pharmacy Woywoy Rosters Database Schema
-- Run this in your Supabase SQL Editor to initialize the tables.

-- 1. Create brisk_employees table
CREATE TABLE IF NOT EXISTS public.brisk_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    max_hours INTEGER NOT NULL DEFAULT 38,
    availability JSONB NOT NULL DEFAULT '{}'::jsonb,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.brisk_employees ENABLE ROW LEVEL SECURITY;

-- 2. Create brisk_users table
CREATE TABLE IF NOT EXISTS public.brisk_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'employee')),
    employee_id UUID REFERENCES public.brisk_employees(id) ON DELETE SET NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.brisk_users ENABLE ROW LEVEL SECURITY;

-- 3. Create brisk_shifts table
CREATE TABLE IF NOT EXISTS public.brisk_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.brisk_employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.brisk_shifts ENABLE ROW LEVEL SECURITY;

-- 4. Create brisk_timecards table
CREATE TABLE IF NOT EXISTS public.brisk_timecards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.brisk_employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
    clock_out TIMESTAMP WITH TIME ZONE,
    breaks JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_hours NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    approved BOOLEAN NOT NULL DEFAULT false,
    approved_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.brisk_timecards ENABLE ROW LEVEL SECURITY;

-- 5. Create brisk_leave_requests table
CREATE TABLE IF NOT EXISTS public.brisk_leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.brisk_employees(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.brisk_leave_requests ENABLE ROW LEVEL SECURITY;

-- 6. Create brisk_invitations table
CREATE TABLE IF NOT EXISTS public.brisk_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('manager', 'employee')),
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.brisk_invitations ENABLE ROW LEVEL SECURITY;

-- 7. Create brisk_settings table
CREATE TABLE IF NOT EXISTS public.brisk_settings (
    id TEXT PRIMARY KEY DEFAULT 'global_settings',
    company_name TEXT NOT NULL DEFAULT 'Amcal Pharmacy Woywoy Rosters'
);

ALTER TABLE public.brisk_settings ENABLE ROW LEVEL SECURITY;

-- =====================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================

-- Drop any existing conflicting policies
DROP POLICY IF EXISTS "auth_all" ON public.brisk_employees;
DROP POLICY IF EXISTS "auth_all" ON public.brisk_shifts;
DROP POLICY IF EXISTS "auth_all" ON public.brisk_timecards;
DROP POLICY IF EXISTS "auth_all" ON public.brisk_leave_requests;
DROP POLICY IF EXISTS "auth_all" ON public.brisk_users;
DROP POLICY IF EXISTS "auth_all" ON public.brisk_invitations;
DROP POLICY IF EXISTS "auth_all" ON public.brisk_settings;

-- Create policies allowing full access to authenticated users
CREATE POLICY "auth_all" ON public.brisk_employees FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON public.brisk_shifts FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON public.brisk_timecards FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON public.brisk_leave_requests FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON public.brisk_users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON public.brisk_invitations FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth_all" ON public.brisk_settings FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Insert default global settings row
INSERT INTO public.brisk_settings (id, company_name) 
VALUES ('global_settings', 'Amcal Pharmacy Woywoy Rosters') 
ON CONFLICT (id) DO NOTHING;
