-- Quita el estado "focus" (Deep focus). Datos existentes → blocked (No disponible).
-- Labels UI: available=Mallanet, limited=Ocupado, blocked=No disponible.

UPDATE recurring_schedules SET status = 'blocked' WHERE status = 'focus';
UPDATE time_blocks SET status = 'blocked' WHERE status = 'focus';

ALTER TABLE recurring_schedules DROP CONSTRAINT IF EXISTS recurring_schedules_status_check;
ALTER TABLE recurring_schedules
  ADD CONSTRAINT recurring_schedules_status_check
  CHECK (status IN ('available', 'limited', 'blocked'));

ALTER TABLE time_blocks DROP CONSTRAINT IF EXISTS time_blocks_status_check;
ALTER TABLE time_blocks
  ADD CONSTRAINT time_blocks_status_check
  CHECK (status IN ('available', 'limited', 'blocked'));
