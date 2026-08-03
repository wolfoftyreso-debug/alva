-- Minimal schema. We store the absolute minimum:
-- no conversations, no profiling data.

create table if not exists users (
  id text primary key, -- Cognito sub
  email text not null,
  provider text not null, -- 'apple' | 'google' | 'email'
  subscription_status text not null default 'free', -- 'free' | 'active'
  created_at timestamptz not null default now()
);

create table if not exists usage (
  user_id text primary key references users (id) on delete cascade,
  messages_used integer not null default 0,
  last_reset timestamptz not null default now()
);
