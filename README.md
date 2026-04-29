# Lab Forms HSA

Production-ready laboratory forms for **E.S.E. Hospital San Antonio de Chía**.

The app manages two operational records:

- **F-021 Termohigrometría**: monthly ambient temperature and humidity by shift.
- **F-029 Neveras / cadena de frío**: refrigerator temperature control, device metadata, signatures, and audit history.

For architecture details, see [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Prerequisites

- Node.js 20 or newer.
- npm.
- Supabase project access.
- Vercel account access for production deployment.

## Local setup

```bash
git clone https://github.com/AndresMarulanda10/lab-forms-hsa.git
cd lab-forms-hsa
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000> after completing the environment variables below.

## Environment variables

Create `.env.local` from `.env.example` and fill in the Supabase values from the project dashboard.

| Variable | Required | Visibility | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser-safe | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Yes | Browser-safe | Publishable key used by the current Supabase clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Compatibility | Browser-safe | Legacy anon key alias for older docs/tools. |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Server-only | Keep secret. Never expose as `NEXT_PUBLIC_*`. |

## Database and migrations

This repository uses Supabase CLI-compatible migrations under `supabase/migrations/`.

```bash
# Install or update the Supabase CLI separately, then authenticate and link:
supabase login
supabase link

# Review pending database changes before applying them:
supabase db diff

# Apply migrations to the linked project when ready:
supabase db push
```

The baseline migration captures the existing schema. The RLS remediation migration replaces permissive `using (true)` policies with authenticated-only access for lab-data tables.

Before routing production traffic, run Supabase Security Advisor and confirm there are no CRITICAL findings.

## Quality checks

Run these checks before opening a pull request:

```bash
npm run lint
npx tsc --noEmit
```

The GitHub Actions workflow runs the same lint and type-check gates for pull requests and pushes to `main`.

## Vercel deployment checklist

Dashboard actions must be performed by the repository/project owner:

1. Connect the GitHub repository to Vercel.
2. Set `main` as the production branch.
3. Configure all required environment variables from `.env.example` in Vercel.
4. Verify a preview deployment from a non-main branch.
5. Merge through a pull request only after CI checks pass.
6. Validate the production deployment and core form flows after release.

## Release process

1. Update `CHANGELOG.md` with the release notes.
2. Ensure lint and type-check pass locally and in CI.
3. Create a version tag, for example `v1.0.0`.
4. Publish a GitHub Release using the matching changelog entry as the body.

Tag and GitHub Release creation require explicit owner approval before execution.
