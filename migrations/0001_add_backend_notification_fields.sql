
-- Add backend notification fields to course_schedules table
ALTER TABLE course_schedules
ADD COLUMN range_location VARCHAR(255),
ADD COLUMN classroom_location VARCHAR(255),
ADD COLUMN arrival_time VARCHAR(8),
ADD COLUMN departure_time VARCHAR(8),
ADD COLUMN day_of_event VARCHAR(50),
ADD COLUMN google_maps_link TEXT,
ADD COLUMN range_location_image_url VARCHAR;
