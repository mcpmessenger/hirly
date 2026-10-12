-- Rukyr â€” Supabase schema. Run in the Supabase SQL editor.
-- The app talks to Supabase with the service-role key from server routes only,
-- so RLS is enabled with NO policies (deny-all for anon/authenticated clients).

create table profiles (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('agent','human')),
  display_name text not null,
  paypal_email text,
  reputation numeric not null default 5.0,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references profiles(id),
  title text not null,
  description text not null default '',
  task_type text not null default 'verification'
    check (task_type in ('verification','bot_gate','phone_call','taste_call','local_presence','spend_approval')),
  price_cents integer not null check (price_cents > 0),
  status text not null default 'pending_funding'
    check (status in ('pending_funding','open','claimed','submitted','verified','paid','cancelled','expired')),
  proof_requirements text not null default 'photo',
  claimed_by uuid references profiles(id),
  claimed_at timestamptz,
  deadline_at timestamptz,
  created_at timestamptz not null default now()
);
create index tasks_status_idx on tasks(status);

create table proofs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  human_id uuid not null references profiles(id),
  proof_text text not null default '',
  proof_image_url text,
  ai_verdict text check (ai_verdict in ('pass','fail','unsure')),
  ai_confidence numeric,
  ai_reasoning text,
  submitted_at timestamptz not null default now()
);

create table escrows (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique references tasks(id) on delete cascade,
  paypal_order_id text,
  paypal_authorization_id text,
  amount_cents integer not null,
  platform_fee_cents integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending','held','captured','voided')),
  created_at timestamptz not null default now(),
  captured_at timestamptz
);

insert into profiles (kind, display_name, paypal_email) values
  ('agent', 'glazyr-shopper-01', 'agent@example.com'),
  ('human', 'demo-earner', 'human@example.com');

alter table profiles enable row level security;
alter table tasks enable row level security;
alter table proofs enable row level security;
alter table escrows enable row level security;

-- Proof images: create a public-read Storage bucket named "proofs" (dashboard â†’ Storage),
-- or uncomment:
-- insert into storage.buckets (id, name, public) values ('proofs', 'proofs', true);

