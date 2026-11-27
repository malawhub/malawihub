# Online Class: secure teacher-controlled enrolment

## Scope of this first implementation slice

This branch introduces the first security and enrolment foundation without changing the production `main` branch.

- Existing active class enrolments are retained and receive the new `active` status.
- Class codes no longer create enrolments. The existing `join_online_class(text)` RPC now returns a class only when the signed-in student already has active membership.
- A teacher with the administrator-granted `can_register_students` permission can find one existing student by exact email or username, but only in a class the teacher owns.
- An authorised teacher or Online Class administrator can enrol, suspend or remove class membership through server-side RPCs.
- Student membership changes are recorded in `online_class_enrollment_events`.
- Class, class-note and class-video-resource read policies remove the legacy unrestricted SELECT policies and require an owner, administrator or active class member.
- Realtime channel authorisation checks active membership.
- The Online Class login page no longer creates student accounts or grants student area access during login.
- Direct password-setting student registration is disabled in the teacher administration Edge Function.
- The teacher dashboard has a class student-management page with individual lookup, CSV import (one exact email/username in the first column, maximum 50 rows) and a new-student email invitation form.
- New-student invitations use a random one-time token; only its SHA-256 hash is stored. The invitation expires after 7 days.
- An invited user must open the email, verify the email address, set a password and redeem the invitation while signed in with that same email. Only then are the student profile, student-area role and class membership activated.
- Class ending replaces destructive class deletion in the teacher dashboard. Existing learning records are retained.

## Intentionally not included yet

- Existing legacy teacher accounts that were created with email confirmation bypassed need a separate account-review process; new registrations now require confirmation.
- XLSX parsing; export an Excel roster to CSV for this first iteration.
- Bulk-import transaction batching and background processing.
- Teacher registration now uses Supabase sign-up email confirmation. The server-side `teacher-self-register` function no longer creates confirmed identities and refuses to grant teacher access unless the authenticated email is verified. Existing legacy accounts still require separate verification/resend handling.
- Offline learning, classroom redesign and audio infrastructure changes.

New students can now be invited through the teacher management page. Existing MalawiHub accounts must still be added through exact account lookup; the invitation endpoint refuses to take over an existing account. If an invitation is lost or expires before email verification, a teacher can issue another invitation to the same class and email. The server will replace only the unverified Auth identity whose metadata contains the exact previous invitation ID for that same class/email. It will never delete a verified or unrelated account. If the student has already verified but did not finish activation, support must resolve the account; a teacher must not attempt to replace it.

## Live database inspection and migration drift

A read-only inspection of the connected Supabase project on 27 November 2026 confirmed that the live schema contains the required classroom tables and columns used by this migration. The live enrollment table also has the unique constraint on `(class_id, student_id)` required by the enrolment upsert.

The live database has applied migration records named `allow_teacher_area_roles_online_classes` and `allow_teacher_area_roles_classroom_file_uploads` that are not present as files in the inspected GitHub `main` tree. The deployed policy names also differ from some names in the repository migrations. This migration therefore drops the additional live policy names observed during the audit, including `class notes select by class membership` and `class members can view enrollments`.

**Do not deploy from this branch until migration-history drift is reconciled.** Compare the full live `supabase_migrations.schema_migrations` list with the repository migration directory and restore/record missing migration files or otherwise resolve the drift through a reviewed process. Do not mark missing migrations as applied by guessing their contents.

## Database migration

Apply `supabase/migrations/202611270001_secure_teacher_controlled_class_enrollment.sql` and then `supabase/migrations/202611270002_secure_student_invitations.sql` only to a staging Supabase project first.

The first migration is additive. It adds membership status and audit fields, a private atomic audit trigger and private RLS helper functions, replaces the class-code enrolment behaviour and replaces known permissive read policies. The second migration adds a private invitation ledger with no direct client grants. Before testing invitations and teacher registration, add both `https://malawihub.pages.dev/online-class/student-activate.html` and `https://malawihub.pages.dev/teacher-portal/activate.html` to the Supabase Auth redirect URL allow-list. Confirm the Auth invite email template uses the Supabase confirmation URL and the email provider is configured and deliverable. The email provider must be configured and deliverable. Teacher lookup and membership changes are validated in the authenticated Edge Function rather than exposed as new public SECURITY DEFINER RPCs. The private helpers are used by RLS policies to avoid recursive policy lookups; the class-entry and realtime helper functions run as SECURITY INVOKER. Existing membership rows default to `active`.

Before applying to production:
1. Confirm the deployed database contains `online_classes`, `online_class_enrollments`, `profiles`, `user_area_roles` and `class_video_resources`.
2. Confirm `public.is_online_class_admin()` exists.
3. Inspect `pg_policies` for any additional permissive policies on the three protected resource tables and remove/replace any equivalent broad policies.
4. Back up the database and record the current migration state.
5. Apply in staging and run the tests below.

## Existing Supabase advisor baseline

The read-only Supabase Security Advisor check also reported pre-existing warnings for public-schema SECURITY DEFINER functions that are executable by anonymous or authenticated roles. Those functions predate this branch and are outside this first enrolment slice. This implementation avoids adding new public SECURITY DEFINER RPC endpoints; its RLS helpers and audit trigger live in the non-exposed `private` schema. Review the existing advisor findings separately before declaring the whole Supabase project security-clean.

## Staging verification checklist

### Existing access and class-code behaviour
- [ ] Existing active enrolments remain active after migration.
- [ ] A signed-in student who is already actively enrolled can open the class using its code.
- [ ] A signed-in student who is not enrolled receives the teacher-enrolment message.
- [ ] A suspended or removed student cannot open the class using its code.
- [ ] An unauthenticated visitor cannot call the class-entry RPC.

### Teacher enrolment
- [ ] A teacher with `can_register_students = true` can find an existing student by exact email.
- [ ] The same teacher can find an existing student by exact username.
- [ ] The teacher cannot search against a class owned by another teacher.
- [ ] A teacher without the registration permission is denied.
- [ ] A student account can be enrolled by its own class teacher.
- [ ] A non-student account cannot be enrolled unless it has the explicit student area role.
- [ ] Repeating an enrolment does not create duplicate membership rows.
- [ ] Re-enrolling a suspended/removed student restores active membership.
- [ ] A teacher cannot enrol or remove students in another teacher's class.

### New student invitation and activation
- [ ] A teacher with registration permission can invite a new email address to a class they own.
- [ ] The invitation is rejected for an existing MalawiHub account; the teacher is directed to existing-student lookup.
- [ ] The invitation email redirects to the activation page and the token is not stored in plaintext in the database.
- [ ] A different signed-in email cannot redeem the invitation.
- [ ] An unverified account cannot redeem the invitation.
- [ ] The correct verified email can set a password and activate student access.
- [ ] The student role, student area and class membership are created only after successful redemption.
- [ ] A token cannot be reused for a second activation and an expired token is rejected.\n- [ ] Reissuing an invitation replaces only the unverified Auth identity linked to the prior invitation for that same class/email.\n- [ ] Reissuing an invitation never deletes a verified account or an account not linked to that invitation.
- [ ] The student can subsequently sign in through Student Login.

### Membership removal and records
- [ ] Suspending a student prevents new class entry and new realtime subscriptions.
- [ ] Removing a student does not delete their MalawiHub authentication account.
- [ ] Class enrolment audit events are written for enrol, reactivate, suspend and remove.
- [ ] Ending a class retains enrolments, assignments, submissions and marks.

### Row Level Security
- [ ] Anonymous users cannot read classes, notes, or class video resources.
- [ ] A student can read only classes and resources for their active memberships.
- [ ] A teacher can read their own classes and class resources.
- [ ] A teacher cannot read another teacher's class roster.
- [ ] Direct client INSERT/UPDATE/DELETE on `online_class_enrollments` is denied.
- [ ] A removed or suspended student cannot newly subscribe to the class realtime topics.

### Front-end smoke tests
- [ ] Student login contains no public Create Account workflow.
- [ ] Student login does not insert a profile or student area role.
- [ ] Teacher dashboard opens Manage Students for an owned class.
- [ ] Manual student lookup and enrolment refresh the roster.
- [ ] New-student invitation action is disabled for teachers without registration permission.
- [ ] Student activation page requires a verified invitation session and a matching email.\n- [ ] New teacher sign-up sends a confirmation email and does not grant a teacher role before verification.\n- [ ] An unverified existing account cannot obtain teacher-area access through the Edge Function.\n- [ ] Retrying registration for an existing unverified email requests a fresh signup confirmation email.\n- [ ] A verified existing MalawiHub user can add teacher-area access without changing their password.\n- [ ] A verified new teacher can activate teacher-area access and reach the Teacher Dashboard.
- [ ] CSV import handles duplicates, invalid rows and the 50-row limit.
- [ ] Class creation works for an authorised teacher.
- [ ] End Class updates status without deleting class records.

## Deployment and rollback

Do not merge this branch or apply the migration to production until staging verification passes. Do not run the migration against production merely because the GitHub pull request is open.

If staging verification fails, leave production unchanged. If the migration has been applied to staging, restore staging from its pre-migration backup or use a reviewed forward-fix migration; do not attempt an improvised destructive rollback after enrolment audit data has been written.
