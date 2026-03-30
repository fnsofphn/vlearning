# Coaching VHDN MVP Architecture

## Goal

Build a multi-tenant `Quản trị Coaching VHDN` module on top of `Supabase + Vercel` that is:

- configurable for many enterprises
- safe enough for leadership coaching content
- able to manage coaching operations and real outcomes, not just schedules
- small enough to ship as an MVP in phases

## Core Assumptions

- `Supabase` is the primary backend for auth, Postgres, storage, and row-level security.
- `Vercel` hosts the frontend and any later edge/serverless functions.
- The current repo continues as a `React + Vite` app for the first build iteration.
- `Coachee` may be an external guest.
- `Reviewer/SME` is optional in phase 1.
- `Artifact sharing` only needs RBAC + audit log in phase 1.
- `Coaching effectiveness` is measured by operational progress in phase 1, not maturity analytics.
- CEO-sensitive content uses `confidential flag + restricted access + audit log` in phase 1.

## Recommended System Shape

### Frontend

- `React + Vite + TypeScript`
- Single web app deployed to Vercel
- Auth session handled with Supabase Auth
- Feature areas:
  - dashboard
  - catalogs
  - programs/cohorts
  - coachees
  - sessions
  - outputs
  - artifacts
  - action plans
  - reports
  - administration

### Backend

- `Supabase Postgres` as the system of record
- `Supabase Auth` for internal users and invited external guests
- `Supabase Storage` for artifacts, templates, and output attachments
- `RLS` for tenant/program/cohort/coachee scoped access
- SQL-first schema and policies

### Deployment

- `Vercel` for preview + production deployments
- environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- later phases may add Vercel functions for integration, scheduled jobs, and email workflows

## Domain Breakdown

### 1. Platform Foundation

- tenants / enterprises
- units
- user profiles
- memberships
- role assignments
- audit logs

### 2. Catalog & Configuration Engine

- coaching service modules
- coaching methods
- process templates
- process template versions
- questionnaire catalogs
- question items
- topic catalogs
- output catalogs
- artifact catalogs

### 3. Program Delivery

- coaching programs
- cohorts
- coach assignments
- coachee profiles
- journey generation from process templates

### 4. Session Operations

- coaching sessions
- pre-work questionnaire sends
- questionnaire responses
- session notes / minutes
- session state changes

### 5. Outcome Operations

- output instances
- output review states
- output files / links / versions
- action plans
- artifact shares
- artifact usage tracking

### 6. Reporting

- operational dashboard
- questionnaire completion
- topic usage
- output progress
- artifact reach
- action plan completion

## Role Model for MVP

- `system_admin`
- `business_admin`
- `coach`
- `coachee_internal`
- `coachee_guest`
- `reviewer`
- `executive_viewer`

## Security Model

### Tenant isolation

- every business record belongs to a `tenant_id`
- all reads/writes must be filtered by tenant membership or explicit guest access

### Scoped access

- coaches see only assigned programs/cohorts/coachees
- guests see only their own sessions, outputs, action plans, and shared artifacts
- executives are read-only and limited by assigned scope

### Confidential content

- records may be marked `is_confidential`
- confidential records require narrower role access
- access is logged

## MVP Modules

### Must build in phase 1

- auth and user/guest access
- tenant + unit + role structure
- service module catalog
- method catalog
- process template + version
- topic catalog
- questionnaire catalog
- output catalog
- artifact catalog
- program + cohort + coachee
- coach assignment
- session scheduling and notes
- pre-work and questionnaire responses
- output lifecycle
- artifact sharing
- action plan tracking
- core reports

### Defer to phase 2

- advanced reviewer workflows
- business impact scoring
- maturity scoring engine
- complex executive confidentiality controls
- ERP/HRM integration
- AI generation/analysis

## Suggested Build Sequence

### Phase 0

- finalize ERD
- finalize permission matrix
- finalize guest invitation flow
- finalize status machines

### Phase 1

- auth
- profiles
- memberships
- roles
- audit log skeleton

### Phase 2

- catalogs and templates

### Phase 3

- programs
- cohorts
- coachees
- assignments
- generated journeys

### Phase 4

- sessions
- questionnaire delivery
- pre-work responses
- session notes

### Phase 5

- outputs
- artifacts
- action plans

### Phase 6

- reports
- UAT
- pilot hardening

## Key Risks

- underestimating the complexity of output/review workflow
- mixing catalog configuration with runtime delivery data
- weak permission modeling for guest and executive users
- trying to define maturity/effectiveness too early

## Recommendation

Treat the first release as an `operational coaching platform MVP`.
Do not try to solve maturity analytics, AI, or enterprise integration in the same phase.
