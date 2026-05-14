BEGIN;

WITH tournament_row AS (
  INSERT INTO tournaments_tournament
    (created_at, updated_at, name, date, format, status)
  VALUES
    (NOW(), NOW(), 'TANA Atlanta Volleyball 2026', DATE '2026-05-16', 'Premium/Star', 'Live')
  RETURNING id
),

courts AS (
  INSERT INTO courts_court
    (created_at, updated_at, name, location, description, is_active)
  VALUES
    (NOW(), NOW(), 'Court 1', 'TANA Atlanta', 'Official tournament court', TRUE),
    (NOW(), NOW(), 'Court 2', 'TANA Atlanta', 'Official tournament court', TRUE)
  ON CONFLICT (name) DO UPDATE
  SET updated_at = NOW(),
      location = EXCLUDED.location,
      description = EXCLUDED.description,
      is_active = TRUE
  RETURNING id, name
),

groups_seed(name) AS (
  VALUES
    ('Group 1'),
    ('Group 2'),
    ('Group 3'),
    ('Group 4'),
    ('Group 5')
),

groups_inserted AS (
  INSERT INTO groups_group
    (created_at, updated_at, tournament_id, name)
  SELECT NOW(), NOW(), tournament_row.id, groups_seed.name
  FROM groups_seed, tournament_row
  RETURNING id, name
),

teams_seed(group_name, team_name) AS (
  VALUES
    ('Group 1', 'Set Panrom'),
    ('Group 1', 'VIKINGS'),
    ('Group 1', 'TNT'),
    ('Group 1', 'eZPass 2'),

    ('Group 2', 'Firefighters'),
    ('Group 2', 'eZpass'),
    ('Group 2', 'LakeHaven Smashers'),
    ('Group 2', 'KALAKEYAS'),

    ('Group 3', 'CloudQ Alpharetta'),
    ('Group 3', 'Volleyball Agents'),
    ('Group 3', 'Punjab'),
    ('Group 3', 'Whistle Squad'),

    ('Group 4', 'TVK'),
    ('Group 4', 'Chattanooga Chargers'),
    ('Group 4', 'Hitmen'),
    ('Group 4', 'Team Strikers'),

    ('Group 5', 'Growing Giants'),
    ('Group 5', 'Atlanta Spikers'),
    ('Group 5', 'Gadde Capitals'),
    ('Group 5', 'Fieldstone')
),

teams_inserted AS (
  INSERT INTO teams_team
    (created_at, updated_at, tournament_id, name)
  SELECT NOW(), NOW(), tournament_row.id, teams_seed.team_name
  FROM teams_seed, tournament_row
  RETURNING id, name
),

group_links AS (
  INSERT INTO groups_groupteam
    (created_at, group_id, team_id)
  SELECT NOW(), groups_inserted.id, teams_inserted.id
  FROM teams_seed
  JOIN groups_inserted ON groups_inserted.name = teams_seed.group_name
  JOIN teams_inserted ON teams_inserted.name = teams_seed.team_name
  RETURNING id
),

schedule_seed(group_name, match_time, team_a, team_b, referee_name, court_name) AS (
  VALUES
    ('Group 1', TIME '07:00', 'TNT', 'eZPass 2', 'Set Panrom', 'Court 1'),
    ('Group 1', TIME '07:20', 'VIKINGS', 'Set Panrom', 'eZPass 2', 'Court 1'),
    ('Group 1', TIME '08:00', 'eZPass 2', 'VIKINGS', 'Set Panrom', 'Court 1'),
    ('Group 1', TIME '08:20', 'Set Panrom', 'TNT', 'VIKINGS', 'Court 1'),
    ('Group 1', TIME '08:40', 'eZPass 2', 'Set Panrom', 'TNT', 'Court 1'),
    ('Group 1', TIME '09:20', 'VIKINGS', 'TNT', 'eZPass 2', 'Court 1'),

    ('Group 2', TIME '07:00', 'LakeHaven Smashers', 'KALAKEYAS', 'Firefighters', 'Court 2'),
    ('Group 2', TIME '07:20', 'eZpass', 'Firefighters', 'KALAKEYAS', 'Court 2'),
    ('Group 2', TIME '08:00', 'KALAKEYAS', 'eZpass', 'Firefighters', 'Court 2'),
    ('Group 2', TIME '08:40', 'Firefighters', 'LakeHaven Smashers', 'eZpass', 'Court 2'),
    ('Group 2', TIME '09:20', 'KALAKEYAS', 'Firefighters', 'LakeHaven Smashers', 'Court 2'),
    ('Group 2', TIME '09:40', 'eZpass', 'LakeHaven Smashers', 'KALAKEYAS', 'Court 2'),

    ('Group 3', TIME '10:00', 'Punjab', 'Whistle Squad', 'CloudQ Alpharetta', 'Court 2'),
    ('Group 3', TIME '10:20', 'Volleyball Agents', 'CloudQ Alpharetta', 'Whistle Squad', 'Court 2'),
    ('Group 3', TIME '10:40', 'Whistle Squad', 'Volleyball Agents', 'CloudQ Alpharetta', 'Court 2'),
    ('Group 3', TIME '11:00', 'CloudQ Alpharetta', 'Punjab', 'Volleyball Agents', 'Court 2'),
    ('Group 3', TIME '11:20', 'Whistle Squad', 'CloudQ Alpharetta', 'Punjab', 'Court 2'),
    ('Group 3', TIME '11:40', 'Volleyball Agents', 'Punjab', 'Whistle Squad', 'Court 2'),

    ('Group 4', TIME '10:20', 'Hitmen', 'Team Strikers', 'TVK', 'Court 1'),
    ('Group 4', TIME '10:40', 'Chattanooga Chargers', 'TVK', 'Team Strikers', 'Court 1'),
    ('Group 4', TIME '11:00', 'Team Strikers', 'Chattanooga Chargers', 'TVK', 'Court 1'),
    ('Group 4', TIME '11:20', 'TVK', 'Hitmen', 'Chattanooga Chargers', 'Court 1'),
    ('Group 4', TIME '11:40', 'Team Strikers', 'TVK', 'Hitmen', 'Court 1'),
    ('Group 4', TIME '12:00', 'Chattanooga Chargers', 'Hitmen', 'Team Strikers', 'Court 1'),

    ('Group 5', TIME '07:40', 'Gadde Capitals', 'Fieldstone', 'Growing Giants', 'Court 1'),
    ('Group 5', TIME '08:20', 'Atlanta Spikers', 'Growing Giants', 'Fieldstone', 'Court 2'),
    ('Group 5', TIME '09:00', 'Fieldstone', 'Atlanta Spikers', 'Growing Giants', 'Court 1'),
    ('Group 5', TIME '09:00', 'Growing Giants', 'Gadde Capitals', 'Atlanta Spikers', 'Court 2'),
    ('Group 5', TIME '09:40', 'Fieldstone', 'Growing Giants', 'Gadde Capitals', 'Court 1'),
    ('Group 5', TIME '10:00', 'Atlanta Spikers', 'Gadde Capitals', 'Fieldstone', 'Court 1')
)

INSERT INTO matches_match
  (
    created_at,
    updated_at,
    tournament_id,
    group_id,
    court_id,
    team_a_id,
    team_b_id,
    winner_team_id,
    next_match_id,
    match_type,
    stage,
    pool_type,
    manual_match,
    bracket_locked,
    court_name,
    referee_name,
    scheduled_time,
    status,
    score_a,
    score_b
  )
SELECT
  NOW(),
  NOW(),
  tournament_row.id,
  groups_inserted.id,
  courts.id,
  team_a.id,
  team_b.id,
  NULL,
  NULL,
  'league',
  'pool_stage',
  'none',
  TRUE,
  FALSE,
  schedule_seed.court_name,
  schedule_seed.referee_name,
  tournament_row.date + schedule_seed.match_time,
  'Scheduled',
  0,
  0
FROM schedule_seed
JOIN tournament_row ON TRUE
JOIN groups_inserted ON groups_inserted.name = schedule_seed.group_name
JOIN courts ON courts.name = schedule_seed.court_name
JOIN teams_inserted team_a ON team_a.name = schedule_seed.team_a
JOIN teams_inserted team_b ON team_b.name = schedule_seed.team_b;

COMMIT;
