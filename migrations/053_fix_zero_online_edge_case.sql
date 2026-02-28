raw_wave AS (
    SELECT
        CASE
            WHEN online_instructors = 0 THEN 1
            ELSE GREATEST(
                1,
                LEAST(
                    5,
                    CEIL(
                        recent_requests::numeric
                        / online_instructors
                    )
                )
            )
        END AS new_raw_wave_size
    FROM liquidity_calc
)
