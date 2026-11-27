# Free staging and safety checks for Online Class

## Purpose

Use GitHub Actions with Supabase's local development database to validate the Online Class database migrations without creating a paid Supabase branch or changing the live MalawiHub project.

## What this protects

- The workflow runs against a disposable PostgreSQL database created on the GitHub-hosted runner.
- It uses the migrations committed to this repository.
- It does not use the production Supabase URL, project reference, database password, service-role key, or production student data.
- It does not deploy Edge Functions, apply migrations to production, or publish the feature branch to the production website.

## Automated check

The workflow `.github/workflows/online-class-local-staging.yml` starts the local Supabase database, applies the repository migrations with `supabase db reset`, and stops the local database even if a prior step fails.

A successful run proves that the migration set can be applied to the local Supabase database. It does **not** prove that the production database has matching migration history, that Auth email delivery works, or that every Edge Function behaves correctly against the live project.

## Manual full local test

On a computer with Docker and the Supabase CLI installed:

1. Check the CLI installation with `supabase --version`.
2. Start local services with `supabase start`.
3. Apply migrations and reset local data with `supabase db reset`.
4. Run database tests if present with `supabase test db`.
5. Serve functions locally for isolated integration testing with `supabase functions serve`.
6. Use only disposable test accounts and synthetic student records.
7. Stop local services with `supabase stop`.

Do not put production secrets in GitHub Actions or local test files. Do not point the preview website at production credentials for enrolment testing.

## Limits on this free method

GitHub Actions validates SQL migrations in an isolated database, but full Auth email confirmation, invitation redemption, storage, Realtime, and Android browser flows still need end-to-end testing. Because the project owner primarily works from an Android phone, the automated GitHub runner handles the Docker-dependent database check; no Docker installation on the phone is required.

## Release gate

Keep PR #63 as a draft. Do not merge, deploy Edge Functions, apply migrations to production, or change production Auth settings until:

- the migration workflow passes;
- migration-history drift has been reconciled;
- invitation and teacher registration flows have been tested with disposable accounts;
- RLS and SECURITY DEFINER findings have been reviewed;
- Android student and teacher flows have been checked.
