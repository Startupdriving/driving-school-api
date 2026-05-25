export async function acquireReplayLock(

  client,
  lockName

) {

  const existing =
    await client.query(`

      SELECT *
      FROM replay_lock

      WHERE lock_name = $1
      AND lock_status = 'active'

      LIMIT 1

    `, [lockName]);

  if (existing.rows.length) {

  const lock =
    existing.rows[0];

  const acquiredAt =
    new Date(
      lock.acquired_at
    );

  const ageMs =
    Date.now() -
    acquiredAt.getTime();

  const STALE_LOCK_MS =
    10 * 60 * 1000;

  // =====================================================
  // STALE LOCK RECOVERY
  // =====================================================

  if (ageMs > STALE_LOCK_MS) {

    console.log(
      `♻️ RECOVERING STALE LOCK: ${lockName}`
    );

    await client.query(`

      UPDATE replay_lock

      SET

        lock_status = 'released',

        released_at = NOW()

      WHERE id = $1

    `, [lock.id]);

  }

  else {

    throw new Error(
      `replay_lock_active:${lockName}`
    );

  }

}

  await client.query(`

    INSERT INTO replay_lock (

      lock_name,
      lock_status

    )

    VALUES (

      $1,
      'active'

    )

  `, [lockName]);

}



export async function releaseReplayLock(

  client,
  lockName

) {

  await client.query(`

    UPDATE replay_lock

    SET

      lock_status = 'released',

      released_at = NOW()

    WHERE lock_name = $1
    AND lock_status = 'active'

  `, [lockName]);

}
