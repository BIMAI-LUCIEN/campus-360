-- The API and the admin used to invent an address for a company without contact
-- (contact@campus360b.site, recrutement@<name>.org): an application could leave for it.
-- Only the exact generated values are cleared. contact_email stays "not null": empty means none.
begin;

with placeholders as (
  update public.stage_companies c
     set contact_email = ''
   where c.contact_email = 'contact@campus360b.site'
      or c.contact_email = 'recrutement@'
           || coalesce(nullif(regexp_replace(lower(trim(c.name)), '[^a-z0-9]', '', 'g'), ''), 'stage')
           || '.org'
  returning c.id
)
update public.stage_jobs j
   set apply_method = 'PHYSICAL'
  from placeholders p
 where j.company_id = p.id
   and j.apply_method = 'EMAIL';

commit;
