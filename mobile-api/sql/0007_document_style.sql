-- Document style (Module 20): one JSON object read by the editor, the preview and
-- both exports. Existing documents get a partial style built from their legacy
-- columns; missing keys are filled with the preset defaults at read time. Idempotent.

alter table public.app_documents add column if not exists document_style jsonb;

update public.app_documents
set document_style = jsonb_build_object(
  'version', 1,
  'preset', 'classique',
  'typography', jsonb_build_object(
    'bodyFont', case coalesce(font_family, '')
      when 'Georgia' then 'Georgia'
      when 'Lora' then 'Georgia'
      when 'Arial' then 'Arial'
      when 'Calibri' then 'Calibri'
      when 'Garamond' then 'Garamond'
      when 'Cambria' then 'Cambria'
      else 'Times New Roman'
    end,
    'lineSpacing', least(2.5, greatest(1, coalesce(line_spacing, 1.5)))
  ),
  'page', jsonb_build_object(
    'margins', case when margins in ('narrow', 'normal', 'wide') then margins else 'normal' end
  ),
  'cover', jsonb_build_object(
    'template', case coalesce(cover_template, '')
      when 'minimalist' then 'minimal'
      when 'tech' then 'modern'
      else 'classic'
    end
  )
)
where document_style is null;
