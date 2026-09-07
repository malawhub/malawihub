-- Allow one Airtel Money integration and one Mpamba integration per workspace.
alter table public.business_integrations drop constraint if exists business_integrations_workspace_id_key;
alter table public.business_integrations add constraint business_integrations_workspace_provider_key unique(workspace_id, provider);
