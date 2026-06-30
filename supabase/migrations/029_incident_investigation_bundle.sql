-- Bundle: investigation + closure + extended fields + NDIS report fields (final schema)
-- Safe to run if earlier migrations (022–028) were never applied.

-- 022: core investigation columns
alter table public.incidents
  add column if not exists investigation_status text not null default 'sent',
  add column if not exists investigated_by_staff_id uuid references public.staff(id) on delete set null,
  add column if not exists investigated_by_name text not null default '',
  add column if not exists investigation_summary text not null default '',
  add column if not exists investigation_root_cause text not null default '',
  add column if not exists investigation_corrective_actions text not null default '',
  add column if not exists investigation_preventative_actions text not null default '',
  add column if not exists investigation_completed_at timestamptz;

-- 024: closure review columns
alter table public.incidents
  add column if not exists closed_by_staff_id uuid references public.staff(id) on delete set null,
  add column if not exists closed_by_name text not null default '',
  add column if not exists closure_notes text not null default '',
  add column if not exists closed_at timestamptz;

-- 026: extended investigation form fields
alter table public.incidents
  add column if not exists investigation_wellbeing_actions text not null default '',
  add column if not exists investigation_ndis_reportable_type text not null default '',
  add column if not exists investigation_referred_to_notifier text not null default '',
  add column if not exists investigation_commission_advised_at timestamptz,
  add column if not exists investigation_family_carer_notified text not null default '',
  add column if not exists investigation_required_flag text not null default '',
  add column if not exists investigation_incident_details text not null default '',
  add column if not exists investigation_findings text not null default '',
  add column if not exists investigation_mitigation_actions text not null default '',
  add column if not exists investigation_actions_completed text not null default '',
  add column if not exists investigation_actions_completed_at timestamptz,
  add column if not exists investigation_participant_feedback_process text not null default '',
  add column if not exists investigation_participant_feedback_comments text not null default '',
  add column if not exists investigation_improvement_actions text not null default '',
  add column if not exists investigation_staff_performance_required text not null default '',
  add column if not exists investigation_improvement_implemented text not null default '',
  add column if not exists investigation_resolved_at timestamptz,
  add column if not exists investigation_resolved_by_staff_id uuid references public.staff(id) on delete set null,
  add column if not exists investigation_resolved_by_name text not null default '',
  add column if not exists investigation_attachments jsonb not null default '[]'::jsonb;

-- 027: NDIS-aligned incident report fields
alter table public.incidents
  add column if not exists provider_aware_at timestamptz,
  add column if not exists contributing_factors text not null default '',
  add column if not exists preventative_measures text not null default '',
  add column if not exists referred_to_notifier text not null default '',
  add column if not exists commission_advised_at timestamptz,
  add column if not exists family_carer_guardian_notified text not null default '';

-- Backfill legacy investigation text into new columns
update public.incidents
set
  investigation_findings = investigation_summary,
  investigation_incident_details = investigation_root_cause,
  investigation_mitigation_actions = investigation_preventative_actions,
  investigation_actions_completed = investigation_corrective_actions
where investigation_findings = ''
  and (
    investigation_summary <> ''
    or investigation_root_cause <> ''
    or investigation_preventative_actions <> ''
    or investigation_corrective_actions <> ''
  );

update public.incidents
set
  referred_to_notifier = coalesce(nullif(referred_to_notifier, ''), investigation_referred_to_notifier),
  commission_advised_at = coalesce(commission_advised_at, investigation_commission_advised_at),
  family_carer_guardian_notified = coalesce(nullif(family_carer_guardian_notified, ''), investigation_family_carer_notified)
where investigation_referred_to_notifier <> ''
   or investigation_commission_advised_at is not null
   or investigation_family_carer_notified <> '';

-- 028: sent / in_progress / completed / closed
update public.incidents
set investigation_status = 'sent'
where investigation_status in ('draft', 'not_started');

alter table public.incidents
  drop constraint if exists incidents_investigation_status_check;

alter table public.incidents
  add constraint incidents_investigation_status_check
    check (investigation_status in ('sent', 'in_progress', 'completed', 'closed'));

alter table public.incidents
  alter column investigation_status set default 'sent';

notify pgrst, 'reload schema';
