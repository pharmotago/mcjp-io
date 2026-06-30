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
-- With RLS enabled and no public policies defined, all public client (anon key) read/write access is blocked by default.
-- Only serverless functions using the SUPABASE_SERVICE_ROLE_KEY can read and write.
ALTER TABLE public.brisk_employees ENABLE ROW LEVEL SECURITY;

-- 2. Create brisk_users table
CREATE TABLE IF NOT EXISTS public.brisk_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'employee')),
    employee_id UUID REFERENCES public.brisk_employees(id) ON DELETE SET NULL,
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

-- CLEANUP SQL: Run this block to clean up any legacy public access policies in existing installations:
-- DROP POLICY IF EXISTS "Allow all public access for demo service" ON public.brisk_employees;
-- DROP POLICY IF EXISTS "Allow all public access for demo service" ON public.brisk_users;
-- DROP POLICY IF EXISTS "Allow all public access for demo service" ON public.brisk_shifts;
-- DROP POLICY IF EXISTS "Allow all public access for demo service" ON public.brisk_timecards;
-- DROP POLICY IF EXISTS "Allow all public access for demo service" ON public.brisk_leave_requests;
-- DROP POLICY IF EXISTS "Allow all public access for demo service" ON public.brisk_invitations;
