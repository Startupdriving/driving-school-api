ALTER TABLE lesson_schedule_projection
ADD COLUMN car_id UUID;

-- Optional but important for performance
CREATE INDEX idx_lesson_schedule_car_time
ON lesson_schedule_projection (car_id, start_time, end_time);
