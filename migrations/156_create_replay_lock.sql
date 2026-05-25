CREATE TABLE replay_lock (

  id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),

  lock_name TEXT NOT NULL UNIQUE,

  lock_status TEXT NOT NULL,

  acquired_at TIMESTAMPTZ
    NOT NULL DEFAULT NOW(),

  released_at TIMESTAMPTZ

);
