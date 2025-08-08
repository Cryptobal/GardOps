-- Schema para el módulo Documentos (MVP)
create table if not exists doc_templates(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  content text not null, -- HTML con {{variables}}
  variables text[] default '{}', -- ej: {guardia_nombre, fecha_contrato}
  created_at timestamptz default now()
);

create table if not exists doc_documents(
  id uuid primary key default gen_random_uuid(),
  template_id uuid references doc_templates(id),
  entity_type text not null, -- 'guardia','instalacion', etc
  entity_id text not null,
  data jsonb not null, -- key->value resueltas
  html_rendered text not null,
  pdf_url text, -- opcional en esta fase
  status text default 'draft', -- draft|signed
  created_at timestamptz default now()
);

create table if not exists doc_signatures(
  id uuid primary key default gen_random_uuid(),
  document_id uuid references doc_documents(id),
  signer_name text not null,
  signer_email text,
  signature_png_url text not null,
  signed_at timestamptz default now()
);

