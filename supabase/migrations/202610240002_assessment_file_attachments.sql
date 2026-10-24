insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('class-assessment-files','class-assessment-files',false,20971520,
array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain','image/jpeg','image/png','image/webp','application/zip'])
on conflict (id) do update set public=false,file_size_limit=20971520,allowed_mime_types=excluded.allowed_mime_types;
alter table public.teacher_assessments add column if not exists attachment jsonb;
alter table public.teacher_assessment_submissions add column if not exists attachment jsonb;