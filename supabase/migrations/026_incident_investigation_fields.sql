-- Extended NDIS investigation form fields

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
