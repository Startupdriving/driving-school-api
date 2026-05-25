CREATE TABLE projection_checkpoint (

  projection_name TEXT PRIMARY KEY,

  last_processed_sequence BIGINT NOT NULL DEFAULT 0,

  last_processed_at TIMESTAMP,

  replay_completed BOOLEAN DEFAULT FALSE,

  replay_started_at TIMESTAMP,

  replay_completed_at TIMESTAMP,

  updated_at TIMESTAMP DEFAULT NOW()

);
