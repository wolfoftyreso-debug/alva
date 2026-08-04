-- Minimal schema. We store the absolute minimum:
-- no conversations, no profiling data.

create table if not exists users (
  id text primary key, -- Cognito sub, or guest:<device-id>
  email text not null,
  auth_provider text not null, -- 'apple' | 'google' | 'email' | 'guest'
  subscription text not null default 'free', -- 'free' | 'active'
  created_at timestamptz not null default now()
);

create table if not exists usage (
  user_id text primary key references users (id) on delete cascade,
  messages_used integer not null default 0,
  last_reset timestamptz not null default now()
);
