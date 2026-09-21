-- MalawiHub database hardening: 2026-09-21
-- Keep trigger-only SECURITY DEFINER helpers out of the public RPC surface.
revoke execute on function public.prevent_profile_privilege_escalation() from public, anon, authenticated;
revoke execute on function public.protect_profile_roles() from public, anon, authenticated;

-- Cover foreign keys flagged by the Supabase performance advisor.
create index if not exists business_device_connections_workspace_id_idx on public.business_device_connections(workspace_id);
create index if not exists business_invites_workspace_id_idx on public.business_invites(workspace_id);
create index if not exists business_members_user_id_idx on public.business_members(user_id);
create index if not exists business_notifications_recipient_id_idx on public.business_notifications(recipient_id);
create index if not exists business_notifications_transaction_id_idx on public.business_notifications(transaction_id);
create index if not exists business_notifications_workspace_id_idx on public.business_notifications(workspace_id);
create index if not exists business_transactions_employee_id_idx on public.business_transactions(employee_id);
create index if not exists business_workspaces_owner_id_idx on public.business_workspaces(owner_id);
create index if not exists class_video_resources_class_id_idx on public.class_video_resources(class_id);
create index if not exists online_class_enrollments_student_id_idx on public.online_class_enrollments(student_id);
create index if not exists online_classes_teacher_id_idx on public.online_classes(teacher_id);
create index if not exists payments_plan_id_idx on public.payments(plan_id);
create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists premium_access_plan_id_idx on public.premium_access(plan_id);