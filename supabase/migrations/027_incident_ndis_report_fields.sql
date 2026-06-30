-- NDIS-aligned incident report fields (initial record + notification tracking)

alter table public.incidents
  add column if not exists provider_aware_at timestamptz,
  add column if not exists contributing_factors text not null default '',
  add column if not exists preventative_measures text not null default '',
  add column if not exists referred_to_notifier text not null default '',
  add column if not exists commission_advised_at timestamptz,
  add column if not exists family_carer_guardian_notified text not null default '';

update public.incidents
set
  referred_to_notifier = coalesce(nullif(referred_to_notifier, ''), investigation_referred_to_notifier),
  commission_advised_at = coalesce(commission_advised_at, investigation_commission_advised_at),
  family_carer_guardian_notified = coalesce(nullif(family_carer_guardian_notified, ''), investigation_family_carer_notified)
where investigation_referred_to_notifier <> ''
   or investigation_commission_advised_at is not null
   or investigation_family_carer_notified <> '';
