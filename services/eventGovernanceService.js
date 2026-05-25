export async function validateEventGovernance(
  client,
  {
    identity_id,
    event_type,
    causation_id = null
  }
) {

  // =====================================================
  // STEP 1 — LOAD AGGREGATE TYPE
  // =====================================================

  const identityRes =
    await client.query(`
      SELECT identity_type
      FROM identity
      WHERE id = $1
      LIMIT 1
    `, [identity_id]);

  if (identityRes.rowCount === 0) {

  await client.query(`
    INSERT INTO governance_violation_log (
      id,
      identity_id,
      event_type,
      causation_id,
      violation_type,
      error_message,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      $1,
      $2,
      $3,
      $4,
      $5,
      NOW()
    )
  `, [
    identity_id,
    event_type,
    causation_id,
    'identity_missing',
    'governance_identity_missing'
  ]);

  throw new Error(
    "governance_identity_missing"
  );

}

  const aggregateType =
    identityRes.rows[0].identity_type;

  // =====================================================
  // STEP 2 — LOAD GOVERNANCE RULE
  // =====================================================

  const governanceRes =
    await client.query(`
      SELECT
        birth_event_type,
        allow_pre_birth_events
      FROM aggregate_governance_rule
      WHERE aggregate_type = $1
      LIMIT 1
    `, [aggregateType]);

  if (governanceRes.rowCount === 0) {

  await client.query(`
    INSERT INTO governance_violation_log (
      id,
      identity_id,
      event_type,
      causation_id,
      violation_type,
      error_message,
      created_at
    )
    VALUES (
      gen_random_uuid(),
      $1,
      $2,
      $3,
      $4,
      $5,
      NOW()
    )
  `, [
    identity_id,
    event_type,
    causation_id,
    'missing_governance_rule',
    `governance_rule_missing:${aggregateType}`
  ]);

  throw new Error(
    `governance_rule_missing:${aggregateType}`
  );

}

  const governance =
    governanceRes.rows[0];

  // =====================================================
  // STEP 3 — CHECK EXISTING STREAM
  // =====================================================

  const streamRes =
    await client.query(`
      SELECT 1
      FROM event
      WHERE identity_id = $1
      LIMIT 1
    `, [identity_id]);

  const streamExists =
    streamRes.rowCount > 0;

  // =====================================================
  // STEP 4 — ENFORCE BIRTH EVENT
  // =====================================================

  if (!streamExists) {

    if (
      event_type !== governance.birth_event_type &&
      !governance.allow_pre_birth_events
    ) {

      await client.query(`
  INSERT INTO governance_violation_log (
    id,
    identity_id,
    event_type,
    causation_id,
    violation_type,
    error_message,
    created_at
  )
  VALUES (
    gen_random_uuid(),
    $1,
    $2,
    $3,
    $4,
    $5,
    NOW()
  )
`, [
  identity_id,
  event_type,
  causation_id,
  'pre_birth_event',
  `pre_birth_event:${event_type}`
]);

throw new Error(
  `pre_birth_event:${event_type}`
);

    }

  }

  // =====================================================
  // STEP 5 — CAUSATION VALIDATION
  // =====================================================

  if (causation_id) {

    const causationRes =
      await client.query(`
        SELECT 1
        FROM event
        WHERE id = $1
        LIMIT 1
      `, [causation_id]);

    if (causationRes.rowCount === 0) {

      await client.query(`
  INSERT INTO governance_violation_log (
    id,
    identity_id,
    event_type,
    causation_id,
    violation_type,
    error_message,
    created_at
  )
  VALUES (
    gen_random_uuid(),
    $1,
    $2,
    $3,
    $4,
    $5,
    NOW()
  )
`, [
  identity_id,
  event_type,
  causation_id,
  'invalid_causation',
  `invalid_causation:${causation_id}`
]);

throw new Error(
  `invalid_causation:${causation_id}`
);

    }

  }

}
