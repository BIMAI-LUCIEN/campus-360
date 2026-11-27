-- Migration 0035: Catalogue des modèles de CV (contexte.md §25, Module 39)
-- Stocke les 15 designs professionnels (5 existants + 10 nouveaux) sur moteur
-- de layouts paramétrique + theme_config JSONB + custom_css assaini côté API.

create table if not exists public.cv_templates (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  label text not null check (char_length(trim(label)) between 2 and 60),
  description text not null check (char_length(trim(description)) between 4 and 180),
  category text not null check (category in ('classique', 'moderne', 'ats', 'creatif', 'tech', 'academique')),
  layout_family text not null check (
    layout_family in (
      'classic',
      'sidebar-left',
      'sidebar-right',
      'banner-top',
      'timeline',
      'ats-clean',
      'executive-split',
      'minimal-swiss',
      'editorial',
      'compact-grid'
    )
  ),
  theme_config jsonb not null default '{}'::jsonb,
  custom_css text not null default '' check (char_length(custom_css) <= 4096),
  thumbnail_url text,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cv_templates_active_order
  on public.cv_templates (is_active, sort_order, id);

insert into public.cv_templates (id, label, description, category, layout_family, theme_config, custom_css, is_active, sort_order)
values
  (
    'classic',
    'Officiel',
    'Le gabarit Campus 360, sobre',
    'classique',
    'classic',
    '{"accent":"#0F172A","headerBg":"#FFFFFF","headerText":"#0F172A","sidebarBg":"#F8FAFC","fontFamily":"sans","density":"normal","showPhoto":false}'::jsonb,
    '',
    true,
    10
  ),
  (
    'prestige',
    'Prestige',
    'Photo carrée, colonne marine',
    'moderne',
    'sidebar-left',
    '{"accent":"#1E3A5F","headerBg":"#FFFFFF","headerText":"#0F172A","sidebarBg":"#0F2537","fontFamily":"sans","density":"normal","showPhoto":true}'::jsonb,
    '',
    true,
    20
  ),
  (
    'ingenieur',
    'Ingénieur',
    'Frise chronologique, profil technique',
    'tech',
    'timeline',
    '{"accent":"#1D4ED8","headerBg":"#111827","headerText":"#FFFFFF","sidebarBg":"#F1F5F9","fontFamily":"sans","density":"normal","showPhoto":true}'::jsonb,
    '',
    true,
    30
  ),
  (
    'etudiant',
    'Étudiant',
    'Minimaliste, bandeau arrondi',
    'moderne',
    'banner-top',
    '{"accent":"#334155","headerBg":"#F1F5F9","headerText":"#0F172A","sidebarBg":"#FFFFFF","fontFamily":"sans","density":"normal","showPhoto":true}'::jsonb,
    '',
    true,
    40
  ),
  (
    'ats',
    'ATS',
    'Une colonne, lu par les logiciels de tri',
    'ats',
    'ats-clean',
    '{"accent":"#111827","headerBg":"#FFFFFF","headerText":"#111827","sidebarBg":"#FFFFFF","fontFamily":"sans","density":"compact","showPhoto":false}'::jsonb,
    '',
    true,
    50
  ),
  (
    'executif',
    'Exécutif',
    'En-tête affirmé, profil cadre & direction',
    'classique',
    'executive-split',
    '{"accent":"#1E293B","headerBg":"#0F172A","headerText":"#FFFFFF","sidebarBg":"#F8FAFC","fontFamily":"serif","density":"normal","showPhoto":false}'::jsonb,
    '',
    true,
    60
  ),
  (
    'suisse',
    'Suisse Minimal',
    'Typographie épurée, grille géométrique',
    'moderne',
    'minimal-swiss',
    '{"accent":"#DC2626","headerBg":"#FFFFFF","headerText":"#111827","sidebarBg":"#FAFAFA","fontFamily":"sans","density":"normal","showPhoto":false}'::jsonb,
    '',
    true,
    70
  ),
  (
    'royal',
    'Bandeau Royal',
    'En-tête violet royal, moderne et lisible',
    'moderne',
    'banner-top',
    '{"accent":"#7C3AED","headerBg":"#5B21B6","headerText":"#FFFFFF","sidebarBg":"#F5F3FF","fontFamily":"sans","density":"normal","showPhoto":true}'::jsonb,
    '',
    true,
    80
  ),
  (
    'colonne-droite',
    'Colonne Droite',
    'Expériences à gauche, atouts à droite',
    'classique',
    'sidebar-right',
    '{"accent":"#0F766E","headerBg":"#FFFFFF","headerText":"#0F172A","sidebarBg":"#F0FDFA","fontFamily":"sans","density":"normal","showPhoto":true}'::jsonb,
    '',
    true,
    90
  ),
  (
    'creatif',
    'Créatif Studio',
    'Accent dynamique pour marketing & design',
    'creatif',
    'editorial',
    '{"accent":"#C2410C","headerBg":"#FFF7ED","headerText":"#7C2D12","sidebarBg":"#FFF7ED","fontFamily":"sans","density":"normal","showPhoto":true}'::jsonb,
    '',
    true,
    100
  ),
  (
    'finance',
    'Finance Sobre',
    'Serif structuré, banque, audit et gestion',
    'ats',
    'ats-clean',
    '{"accent":"#1E3A8A","headerBg":"#FFFFFF","headerText":"#0F172A","sidebarBg":"#FFFFFF","fontFamily":"serif","density":"compact","showPhoto":false}'::jsonb,
    '',
    true,
    110
  ),
  (
    'tech',
    'Tech Dark-Header',
    'En-tête sombre, idéal dev, cloud & data',
    'tech',
    'timeline',
    '{"accent":"#0284C7","headerBg":"#0B1120","headerText":"#F8FAFC","sidebarBg":"#F8FAFC","fontFamily":"mono-accent","density":"compact","showPhoto":false}'::jsonb,
    '',
    true,
    120
  ),
  (
    'academique',
    'Académique',
    'Focus diplômes, recherche et projets',
    'academique',
    'editorial',
    '{"accent":"#4338CA","headerBg":"#FFFFFF","headerText":"#1E1B4B","sidebarBg":"#EEF2FF","fontFamily":"serif","density":"normal","showPhoto":false}'::jsonb,
    '',
    true,
    130
  ),
  (
    'compact',
    'Compact 1-Page',
    'Densité maîtrisée pour tout tenir sur 1 page',
    'ats',
    'compact-grid',
    '{"accent":"#334155","headerBg":"#F8FAFC","headerText":"#0F172A","sidebarBg":"#F8FAFC","fontFamily":"sans","density":"compact","showPhoto":false}'::jsonb,
    '',
    true,
    140
  ),
  (
    'emeraude',
    'Moderne Émeraude',
    'Colonne vert émeraude, frais et contrasté',
    'creatif',
    'sidebar-left',
    '{"accent":"#047857","headerBg":"#FFFFFF","headerText":"#0F172A","sidebarBg":"#064E3B","fontFamily":"sans","density":"normal","showPhoto":true}'::jsonb,
    '',
    true,
    150
  )
on conflict (id) do nothing;
