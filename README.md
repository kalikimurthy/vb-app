# Volleyball Tournament Management App

Full-stack tournament management platform with Django + PostgreSQL backend and Angular frontend. Supports league stages, knockout/pool brackets, score updates, standings, court scheduling, and admin-controlled manual bracket editing.

## Stack

- Backend: Django 5 + Django REST Framework
- Database: PostgreSQL
- Frontend: Angular (standalone components)
- Mobile support: responsive Angular UI for phone/tablet layouts

## Project Structure

- `backend/` Django backend with domain apps and REST APIs
- `frontend/` Angular SPA
- `docker-compose.yml` local PostgreSQL setup

Backend apps:

- `tournaments`
- `teams`
- `players`
- `courts`
- `groups`
- `matches`
- `standings`
- `brackets`
- `common` (shared base model + seed command)

## Features Implemented

- Tournament CRUD with formats: `Top4`, `Top8`, `Premium/Star`
- Teams and players management with reusable players across tournaments
- Group creation, team assignment to groups
- Court management with active/inactive state
- Match management (league + knockout) with court assignment
- Court conflict detection for overlapping schedules (90-minute window)
- Match filters by tournament, group, pool, round(stage), and court
- Score update endpoint + standings recalculation after league updates
- Standings ranking by: wins, net run rate, points scored
- Bracket generation for Top4/Top8/Premium-Star
- Manual knockout/pool match creation and slot editing
- Bracket lock/unlock controls (score-only edits while locked)
- Django admin registration for internal trusted workflows

## Data Model

Core entities implemented:

- `Tournament`
- `Team`
- `Player`
- `TeamPlayer`
- `Court`
- `Group`
- `GroupTeam`
- `Match`
- `Standing`
- `BracketConfig`

Migrations are included under each app’s `migrations/0001_initial.py`.

## Local Setup

### 1) Start PostgreSQL

```bash
docker compose up -d db
```

### 2) Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_demo
python manage.py runserver
```

Backend runs on `http://localhost:8000`.

### 3) Frontend setup

```bash
cd frontend
npm install --cache ../.npm-cache
npm start
```

Frontend runs on `http://localhost:4200`.

## API Overview

Base URL: `http://localhost:8000/api/`

### Core REST resources

- `/tournaments/`
- `/teams/`
- `/team-players/`
- `/players/`
- `/courts/`
- `/groups/`
- `/group-teams/`
- `/matches/`
- `/standings/`

### Matches extras

- `POST /matches/{id}/update_score/`
- `GET /matches/by_court/?court={court_id}`
- `GET /matches/by_round/?stage={stage}`

### Standings extras

- `POST /standings/recalculate/` body: `{ "tournament": <id> }`
- `POST /standings/split_pools/` body: `{ "tournament": <id> }`

### Brackets actions

- `POST /brackets/generate/` body: `{ "tournament_id": <id> }`
- `POST /brackets/manual_match/` body: manual knockout/pool match payload
- `PATCH /brackets/update_slots/` body: `{ "match_id", "team_a", "team_b", "stage", "pool_type" }`
- `POST /brackets/lock/` body: `{ "tournament_id": <id>, "locked": true|false }`
- `POST /brackets/assign_court/` body: `{ "match_id": <id>, "court_id": <id> }`

## Business Rules

- Players can participate in multiple tournaments through `TeamPlayer`
- Teams belong to one tournament
- League matches attach to groups; knockout/pool matches do not
- Completed league match updates trigger standings recalculation
- Bracket manual edits are blocked while `bracket_locked=true`
- Court conflict checks run before match save
- Premium/Star flow supports separate pool-type knockout matches

## Seed Data

Run:

```bash
cd backend
source .venv/bin/activate
python manage.py seed_demo
```

This creates:

- 1 tournament
- 16 teams + players
- 2 groups
- 4 courts
- initial league matches

## Notes

- CORS is enabled for local dev (`CORS_ALLOW_ALL_ORIGINS=True`).
- Frontend is responsive and optimized for mobile browser usage.
- Optional Capacitor/Ionic wrapping can be added later using the existing responsive Angular UI.
