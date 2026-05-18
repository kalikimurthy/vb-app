import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { Court, Group, GroupTeam, Match, Standing, Team, Tournament } from '../../core/models';
import {
  formatMatchTime,
  getCourtName,
  getGroupName,
  getMatchFormatLabel,
  getMatchStageLabel,
  normalizeStage,
  getTeamName,
} from '../matches/match-display.helpers';
import {
  BracketProjection,
  PublicBracketKey,
  buildProgressionProjection,
} from './progression-projection';

@Component({
  selector: 'app-tournament-viewer-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <article class="viewer-page" *ngIf="tournament; else loading">
      <header class="page-hero viewer-hero">
        <div>
          <p class="kicker">{{ isBracketPage ? 'Public Brackets' : 'Public Viewer' }}</p>
          <h2>{{ tournament.name }}</h2>
          <p>{{ tournament.date }} - {{ tournament.format }}</p>
          <div class="trust-labels" aria-label="Official schedule details">
            <span>Official TANA Schedule</span>
            <span>Court and referee assignments included</span>
          </div>
        </div>
        <div class="viewer-status">
          <span class="status-pill">{{ tournament.status || 'Draft' }}</span>
          <span class="read-only-pill">Read-only</span>
          <a *ngIf="isBracketPage" class="viewer-link-pill" [routerLink]="['/viewer/tournament', tournamentId]">
            Back to Scoreboard
          </a>
        </div>
      </header>

      <section class="viewer-summary" aria-label="Tournament status summary" *ngIf="!isBracketPage">
        <article class="summary-card live-summary" *ngIf="featuredLiveMatch; else noLiveMatch">
          <p class="kicker">Now Live</p>
          <ng-container *ngTemplateOutlet="summaryMatch; context: { $implicit: featuredLiveMatch }"></ng-container>
        </article>
        <ng-template #noLiveMatch>
          <article class="summary-card muted-summary">
            <p class="kicker">Now Live</p>
            <h3>No live matches right now</h3>
            <p>{{ completedMatches.length }} of {{ matches.length }} matches completed</p>
          </article>
        </ng-template>

        <article class="summary-card" *ngIf="nextScheduledMatch; else noNextMatch">
          <p class="kicker">Next Up</p>
          <ng-container *ngTemplateOutlet="summaryMatch; context: { $implicit: nextScheduledMatch }"></ng-container>
        </article>
        <ng-template #noNextMatch>
          <article class="summary-card muted-summary">
            <p class="kicker">Next Up</p>
            <h3>All scheduled matches are complete</h3>
            <p>Check completed results and projected brackets.</p>
          </article>
        </ng-template>

        <article class="summary-card totals-summary">
          <p class="kicker">Pool Matches</p>
          <h3>{{ completedMatches.length }} / {{ matches.length }} complete</h3>
          <p>Official pool schedule</p>
        </article>
      </section>

      <section class="viewer-tabs" aria-label="Public viewer sections" *ngIf="!isBracketPage">
        <button type="button" [class.active]="activeTab === 'matches'" (click)="activeTab = 'matches'">
          Matches
        </button>
        <button type="button" [class.active]="activeTab === 'groups'" (click)="activeTab = 'groups'">
          Groups
        </button>
        <button type="button" [class.active]="activeTab === 'standings'" (click)="activeTab = 'standings'">
          Standings
        </button>
        <a [routerLink]="['/viewer/tournament', tournamentId, 'brackets']">
          Brackets
        </a>
      </section>

      <ng-container *ngIf="activeTab === 'matches'">
        <section class="public-match-toolbar" aria-label="Match list filter">
          <div>
            <p class="kicker">Match list</p>
            <strong>{{ activeMatchView === 'live' ? liveMatches.length : matches.length }} games</strong>
          </div>
          <div class="match-view-toggle">
            <button type="button" [class.active]="activeMatchView === 'all'" (click)="setMatchView('all')">
              All Games
            </button>
            <button type="button" [class.active]="activeMatchView === 'live'" (click)="setMatchView('live')">
              Live
            </button>
          </div>
        </section>

        <div class="empty-state" *ngIf="activeMatchView === 'live' && !liveMatches.length">
          No live matches right now.
        </div>

        <ng-container *ngFor="let section of publicMatchSections">
          <section class="match-section" *ngIf="section.matches.length">
            <div class="match-section-heading">
              <h3>{{ section.title }}</h3>
              <span>{{ section.matches.length }} Matches</span>
            </div>
            <div class="match-grid">
              <ng-container *ngFor="let match of section.matches">
                <ng-container *ngTemplateOutlet="matchCard; context: { $implicit: match }"></ng-container>
              </ng-container>
            </div>
          </section>
        </ng-container>
      </ng-container>

      <ng-container *ngIf="activeTab === 'groups'">
        <section class="groups-section">
          <div class="section-title">
            <div>
              <p class="kicker">Pool projections</p>
              <h3>Groups</h3>
              <p>Groups update from pool results. Division projection is based on overall pool-stage ranking.</p>
            </div>
            <span>{{ groups.length }} Groups</span>
          </div>

          <div class="projection-legend" aria-label="Division projection legend">
            <span class="legend-item champions">Division A &middot; Champions League: Overall ranks 1-8</span>
            <span class="legend-item premier">Division B &middot; Premier League: Overall ranks 9-16</span>
            <span class="legend-item eliminated">Eliminated: Overall ranks 17-20</span>
            <span class="legend-item pending">Pending: standings incomplete</span>
          </div>

          <div class="groups-grid" *ngIf="groups.length; else noGroups">
            <article class="group-projection-card" *ngFor="let group of groups">
              <div class="group-card-top">
                <div>
                  <p class="kicker">Pool</p>
                  <h4>{{ group.name }}</h4>
                </div>
                <span>{{ getTeamsForGroup(group.id).length }} Teams</span>
              </div>

              <div class="group-team-list" *ngIf="getTeamsForGroup(group.id).length; else emptyGroup">
                <div
                  class="group-team-row"
                  *ngFor="let team of getTeamsForGroup(group.id)"
                  [ngClass]="getProjectionClass(team.id)"
                >
                  <div class="team-row-main">
                    <strong>{{ team.name }}</strong>
                    <span class="projection-badge">{{ getProjectionForTeam(team.id) }}</span>
                  </div>

                  <div class="team-row-stats" *ngIf="getStandingForTeam(team.id) as standing; else pendingStats">
                    <span>#{{ standing.rank }} Overall</span>
                    <span>{{ standing.wins }}-{{ standing.losses }}</span>
                    <span>PF {{ standing.points_scored }}</span>
                    <span>PA {{ standing.points_given }}</span>
                    <span>Diff {{ getPointDifferential(standing) }}</span>
                    <span>Rating {{ standing.net_run_rate }}</span>
                  </div>

                  <ng-template #pendingStats>
                    <div class="team-row-stats">
                      <span>Rank pending</span>
                      <span>0-0</span>
                      <span>PF 0</span>
                      <span>PA 0</span>
                      <span>Diff 0</span>
                      <span>Rating 0</span>
                    </div>
                  </ng-template>
                </div>
              </div>

              <ng-template #emptyGroup>
                <div class="empty-state">Teams will appear when this group is assigned.</div>
              </ng-template>
            </article>
          </div>

          <ng-template #noGroups>
            <div class="empty-state">Groups will appear once tournament setup is available.</div>
          </ng-template>
        </section>
      </ng-container>

      <ng-container *ngIf="activeTab === 'standings'">
        <section class="standings-section">
          <div class="section-title">
            <div>
              <p class="kicker">Read-only standings</p>
              <h3>Tournament table</h3>
            </div>
            <span>{{ standings.length }} Teams</span>
          </div>

          <details class="tiebreak-rules">
            <summary>
              <span>Tiebreak Rules</span>
              <small>How ranks are ordered</small>
            </summary>
            <ol>
              <li><strong>Match wins</strong> decide the table first.</li>
              <li><strong>Point Differential</strong> breaks tied win totals.</li>
              <li><strong>Points For (PF)</strong> is the next tiebreak.</li>
              <li><strong>Head-to-head</strong> is used when the first three are still tied.</li>
            </ol>
            <p>If teams are still level after those checks, the stored rank keeps the table deterministic.</p>
          </details>

          <div class="standings-list" *ngIf="standings.length; else noStandings">
            <article class="standing-card" *ngFor="let standing of standings; let i = index">
              <div class="rank-block">
                <strong>{{ standing.rank }}</strong>
                <span>Rank</span>
              </div>

              <div class="standing-main">
                <strong>{{ getStandingTeamName(standing) }}</strong>
                <small *ngIf="getPoolLabel(standing)">{{ getPoolLabel(standing) }}</small>
                <small class="tie-note" *ngIf="getStandingTiebreakNote(standing, i) as note">{{ note }}</small>
              </div>

              <div class="standing-stats">
                <span class="primary-stat"><strong>{{ standing.wins }}-{{ standing.losses }}</strong> W-L</span>
                <span><strong>{{ standing.points_scored }}</strong> PF</span>
                <span><strong>{{ standing.points_given }}</strong> PA</span>
                <span><strong>{{ getSignedPointDifferential(standing) }}</strong> Diff</span>
              </div>

            </article>
          </div>

          <ng-template #noStandings>
            <div class="empty-state">Standings will appear after completed matches are recorded.</div>
          </ng-template>
        </section>
      </ng-container>

      <ng-container *ngIf="activeTab === 'brackets' || isBracketPage">
        <section class="bracket-section">
          <div class="section-title">
            <div>
              <p class="kicker">Knockout bracket</p>
              <h3>{{ bracketMode === 'official' ? 'Official Bracket' : 'Seeding Preview' }}</h3>
              <p>
                Official bracket shows real knockout matches. Seeding preview shows possible quarterfinal pairings only.
              </p>
            </div>
            <span>Overall ranks decide divisions</span>
          </div>

          <div class="progression-summary">
            <span>Division A &middot; Champions League: overall ranks 1-8</span>
            <span>Division B &middot; Premier League: overall ranks 9-16</span>
            <span>Eliminated: overall ranks 17-20</span>
          </div>

          <div class="league-switch" aria-label="Bracket league">
            <button
              type="button"
              [class.active]="selectedBracket === 'champions'"
              (click)="selectedBracket = 'champions'"
            >
              Division A &middot; Champions League
            </button>
            <button
              type="button"
              [class.active]="selectedBracket === 'premier'"
              (click)="selectedBracket = 'premier'"
            >
              Division B &middot; Premier League
            </button>
          </div>

          <div class="league-switch bracket-mode-switch" aria-label="Bracket mode">
            <button type="button" [class.active]="bracketMode === 'official'" (click)="bracketMode = 'official'">
              Official Bracket
            </button>
            <button type="button" [class.active]="bracketMode === 'seeding'" (click)="bracketMode = 'seeding'">
              Seeding Preview
            </button>
          </div>

          <ng-container *ngIf="activeBracketProjection as bracket">
            <div class="bracket-intro">
              <div>
                <p class="kicker">{{ bracket.rule.name }} bracket</p>
                <h4>{{ bracket.rule.description }}</h4>
                <p *ngIf="bracketMode === 'official'">
                  Bracket will fill after official knockout matches are created. Final results populate advancement.
                </p>
                <p *ngIf="bracketMode === 'seeding'">
                  Preview only - not official. Quarterfinal seed pairings only; no winners are projected.
                </p>
              </div>
              <span>{{ bracket.seeds.length }}/{{ bracketSize }} seeds</span>
            </div>

            <div class="official-bracket-layout" *ngIf="bracketMode === 'official'">
              <div class="desktop-knockout-board desktop-bracket-board" aria-label="Official knockout bracket">
                <section class="bracket-pair bracket-pair-left">
                  <div class="round-heading qf-heading">
                    <span>Round 1</span>
                    <h4>Quarterfinals</h4>
                  </div>

                  <div class="qf-pair-stack">
                    <article class="bracket-match bracket-node" *ngFor="let slot of leftQuarterfinalSlots">
                      <ng-container *ngTemplateOutlet="officialSlot; context: { slot: slot }"></ng-container>
                    </article>
                  </div>

                  <div class="round-heading sf-heading">
                    <span>Round 2</span>
                    <h4>Semifinals</h4>
                  </div>

                  <article class="bracket-match bracket-node semifinal-node">
                    <ng-container *ngTemplateOutlet="officialSlot; context: { slot: semifinalSlots[0] }"></ng-container>
                  </article>
                </section>

                <section class="bracket-column final-column">
                  <div class="round-heading center-heading">
                    <span>Championship</span>
                    <h4>Final</h4>
                  </div>

                  <article class="bracket-match bracket-node center-final">
                    <ng-container *ngTemplateOutlet="officialSlot; context: { slot: finalSlot }"></ng-container>
                  </article>

                  <article class="champion-card compact-champion">
                    <span class="projected-badge">Champion TBD</span>
                    <strong>{{ officialChampionName }}</strong>
                    <small>{{ officialChampionName === 'Champion TBD' ? 'Champion appears after the official final is completed.' : 'Official final completed.' }}</small>
                  </article>

                  <div class="round-heading center-heading third-heading">
                    <span>Placement</span>
                    <h4>3rd Place</h4>
                  </div>

                  <article class="bracket-match bracket-node third-place-match">
                    <ng-container *ngTemplateOutlet="officialSlot; context: { slot: thirdPlaceSlot }"></ng-container>
                  </article>
                </section>

                <section class="bracket-pair bracket-pair-right">
                  <div class="round-heading sf-heading">
                    <span>Round 2</span>
                    <h4>Semifinals</h4>
                  </div>

                  <article class="bracket-match bracket-node semifinal-node">
                    <ng-container *ngTemplateOutlet="officialSlot; context: { slot: semifinalSlots[1] }"></ng-container>
                  </article>

                  <div class="round-heading qf-heading">
                    <span>Round 1</span>
                    <h4>Quarterfinals</h4>
                  </div>

                  <div class="qf-pair-stack">
                    <article class="bracket-match bracket-node" *ngFor="let slot of rightQuarterfinalSlots">
                      <ng-container *ngTemplateOutlet="officialSlot; context: { slot: slot }"></ng-container>
                    </article>
                  </div>
                </section>
              </div>

              <div class="mobile-knockout-track mobile-bracket-board" aria-label="Mobile official knockout bracket">
                <section class="mobile-bracket-round">
                  <div class="mobile-round-title">
                    <span>Round 1</span>
                    <h4>Quarterfinals</h4>
                  </div>

                  <ng-container *ngFor="let slot of quarterfinalSlots">
                    <ng-container *ngTemplateOutlet="mobileBracketCard; context: { slot: slot }"></ng-container>
                  </ng-container>
                </section>

                <section class="mobile-bracket-round mobile-semifinal-round">
                  <div class="mobile-round-title">
                    <span>Round 2</span>
                    <h4>Semifinals</h4>
                  </div>

                  <div class="mobile-semi-pair-slot" *ngFor="let slot of semifinalSlots">
                    <ng-container *ngTemplateOutlet="mobileBracketCard; context: { slot: slot }"></ng-container>
                  </div>
                </section>

                <section class="mobile-bracket-round mobile-final-round">
                  <div class="mobile-round-title">
                    <span>Championship</span>
                    <h4>Final</h4>
                  </div>

                  <ng-container *ngTemplateOutlet="mobileBracketCard; context: { slot: finalSlot }"></ng-container>

                  <div class="mobile-round-title mobile-placement-title">
                    <span>Placement</span>
                    <h4>3rd Place</h4>
                  </div>

                  <ng-container *ngTemplateOutlet="mobileBracketCard; context: { slot: thirdPlaceSlot }"></ng-container>
                </section>

                <section class="mobile-bracket-round champion-round-mobile">
                  <div class="mobile-round-title">
                    <span>Champion</span>
                    <h4>Winner</h4>
                  </div>

                  <article class="champion-card compact-champion mobile-champion-card">
                    <span class="projected-badge">Champion TBD</span>
                    <strong>{{ officialChampionName }}</strong>
                    <small>{{ officialChampionName === 'Champion TBD' ? 'Champion appears after the official final is completed.' : 'Official final completed.' }}</small>
                  </article>
                </section>
              </div>

              <section class="mobile-bracket-detail-panel" *ngIf="selectedMobileBracketSlot as slot">
                <div class="mobile-detail-heading">
                  <span>{{ slot.label }}</span>
                  <strong>{{ slot.stage === 'final' ? 'Final' : slot.stage === 'third_place' ? '3rd Place' : slot.label }}</strong>
                </div>

                <ng-container *ngIf="getOfficialMatch(slot.stage) as match; else mobilePlaceholderDetail">
                  <div class="mobile-detail-score">
                    <strong>{{ getTeamName(match.team_a) }}</strong>
                    <span>{{ match.score_a }} - {{ match.score_b }}</span>
                    <strong>{{ getTeamName(match.team_b) }}</strong>
                  </div>

                  <div class="mobile-detail-grid">
                    <div><span>Court</span><strong>{{ getCourtName(match) }}</strong></div>
                    <div><span>Referee</span><strong>{{ match.referee_name || 'TBD' }}</strong></div>
                    <div><span>Time</span><strong>{{ formatMatchTime(match.scheduled_time) }}</strong></div>
                    <div><span>Status</span><strong>{{ match.status }}</strong></div>
                    <div><span>Division</span><strong>{{ selectedBracket === 'champions' ? 'Division A' : 'Division B' }}</strong></div>
                    <div><span>Round</span><strong>{{ match.stage }}</strong></div>
                    <div><span>Best of</span><strong>{{ match.best_of || 1 }}</strong></div>
                    <div><span>Full score</span><strong>{{ match.score_a }} - {{ match.score_b }}</strong></div>
                  </div>

                  <p class="mobile-series-note" *ngIf="(match.best_of || 1) > 1">
                    Final · Best of 3. Set-by-set scoring not available yet. Main score shows sets won.
                  </p>
                </ng-container>

                <ng-template #mobilePlaceholderDetail>
                  <div class="mobile-detail-grid">
                    <div><span>Status</span><strong>Scheduled</strong></div>
                    <div><span>Format</span><strong>{{ slot.format }}</strong></div>
                    <div><span>Court</span><strong>TBD</strong></div>
                    <div><span>Referee</span><strong>TBD</strong></div>
                    <div><span>Round</span><strong>{{ slot.stage }}</strong></div>
                    <div><span>Teams</span><strong>{{ slot.title }}</strong></div>
                  </div>
                </ng-template>
              </section>
            </div>

            <div class="empty-state" *ngIf="bracketMode === 'official' && !officialKnockoutMatches.length">
              Official knockout matches will appear after they are generated.
            </div>

            <ng-container *ngIf="bracketMode === 'seeding'">
              <div class="empty-state" *ngIf="!bracket.isComplete">
                Bracket seeds will appear after group standings are available. {{ bracket.seeds.length }}/{{ bracketSize }} seeds are ready.
              </div>

              <div class="bracket-board seeding-board" *ngIf="bracket.seeds.length">
                <section class="bracket-round">
                  <div class="round-heading">
                    <span>Preview only</span>
                    <h4>Quarterfinal Pairings</h4>
                  </div>

                  <article class="bracket-match" *ngFor="let matchup of bracket.matchups; let index = index">
                    <div class="matchup-title">
                      <span>QF{{ index + 1 }}</span>
                      <strong>{{ matchup.label }}</strong>
                    </div>

                    <ng-container *ngIf="matchup.top; else seedTopPending">
                      <ng-container *ngTemplateOutlet="compactSeed; context: { $implicit: matchup.top }"></ng-container>
                    </ng-container>
                    <ng-template #seedTopPending>
                      <div class="open-slot">Seed pending</div>
                    </ng-template>

                    <ng-container *ngIf="matchup.bottom; else seedBottomPending">
                      <ng-container *ngTemplateOutlet="compactSeed; context: { $implicit: matchup.bottom }"></ng-container>
                    </ng-container>
                    <ng-template #seedBottomPending>
                      <div class="open-slot">Seed pending</div>
                    </ng-template>
                  </article>
                </section>
              </div>
            </ng-container>

            <details class="seed-details" *ngIf="bracket.seeds.length">
              <summary>Seed list and stats</summary>
              <div class="seed-list">
                <article class="seed-card" *ngFor="let team of bracket.seeds">
                  <ng-container *ngTemplateOutlet="teamSeed; context: { $implicit: team }"></ng-container>
                </article>
              </div>
            </details>
          </ng-container>

          <section class="eliminated-section">
            <div class="section-title compact-title">
              <div>
                <p class="kicker">Eliminated</p>
                <h3>Overall ranks 17-20</h3>
              </div>
              <span>{{ progression.eliminated.length }} Teams</span>
            </div>

            <div class="seed-list eliminated-list" *ngIf="progression.eliminated.length; else noEliminated">
              <article class="seed-card muted-seed" *ngFor="let team of progression.eliminated">
                <ng-container *ngTemplateOutlet="teamSeed; context: { $implicit: team }"></ng-container>
              </article>
            </div>

            <ng-template #noEliminated>
              <div class="empty-state">Eliminated teams will appear after group standings are available.</div>
            </ng-template>
          </section>
        </section>
      </ng-container>

      <ng-template #matchCard let-match>
        <article
          class="viewer-card match-row-card"
          [class.live]="match.status === 'Live'"
          [class.completed]="match.status === 'Completed'"
          [class.expanded]="expandedMatchId === match.id"
          tabindex="0"
          role="button"
          [attr.aria-expanded]="expandedMatchId === match.id"
          (click)="toggleMatch(match)"
          (keyup.enter)="toggleMatch(match)"
        >
          <div class="match-row-main">
            <div class="match-row-status">
              <strong>{{ getCompactStatusPrimary(match) }}</strong>
              <span>{{ getCompactStatusSecondary(match) }}</span>
            </div>

            <div class="match-row-team home">
              <span>{{ getTeamName(match.team_a) }}</span>
            </div>

            <div class="match-row-score">
              {{ getCompactScoreLabel(match) }}
            </div>

            <div class="match-row-team away">
              <span>{{ getTeamName(match.team_b) }}</span>
            </div>

            <span class="compact-court">{{ getCourtName(match) }}</span>
          </div>

          <div class="match-expanded-details" *ngIf="expandedMatchId === match.id">
            <div><span>Court</span><strong>{{ getCourtName(match) }}</strong></div>
            <div><span>Referee</span><strong>{{ match.referee_name || 'TBD' }}</strong></div>
            <div><span>Group / Division</span><strong>{{ getMatchStageLabel(match) || 'Unassigned' }}</strong></div>
            <div><span>Round / Stage</span><strong>{{ match.stage || 'TBD' }}</strong></div>
            <div><span>Match Type</span><strong>{{ getMatchTypeLabel(match) }}</strong></div>
            <div><span>Format</span><strong>{{ getMatchFormatLabel(match) || 'Best of 1' }}</strong></div>
            <div><span>Status</span><strong>{{ match.status }}</strong></div>
            <div><span>Full Score</span><strong>{{ match.score_a }} - {{ match.score_b }}</strong></div>
          </div>
        </article>
      </ng-template>

      <ng-template #officialSlot let-slot="slot">
        <div
          class="bracket-node-body"
          [class.expanded]="expandedBracketStage === slot.stage"
          role="button"
          tabindex="0"
          [attr.aria-expanded]="expandedBracketStage === slot.stage"
          (click)="toggleBracketStage(slot.stage)"
          (keyup.enter)="toggleBracketStage(slot.stage)"
        >
          <ng-container *ngIf="getOfficialMatch(slot.stage) as officialMatch; else officialSlotPlaceholder">
            <ng-container *ngTemplateOutlet="officialBracketMatch; context: { $implicit: officialMatch, label: slot.label, stage: slot.stage }"></ng-container>
          </ng-container>
          <ng-template #officialSlotPlaceholder>
            <ng-container *ngTemplateOutlet="placeholderBracketMatch; context: { label: slot.label, title: slot.title, body: slot.body, format: slot.format, stage: slot.stage }"></ng-container>
          </ng-template>
        </div>
      </ng-template>

      <ng-template #mobileBracketCard let-slot="slot">
        <button
          type="button"
          class="mobile-knockout-card"
          [class.selected]="selectedMobileBracketStage === slot.stage"
          [class.final-card]="slot.stage === 'final'"
          [class.third-card]="slot.stage === 'third_place'"
          (click)="selectMobileBracketStage(slot.stage)"
        >
          <div class="mobile-card-top">
            <span>{{ slot.label }}</span>
            <strong>{{ slot.format }}</strong>
          </div>

          <ng-container *ngIf="getOfficialMatch(slot.stage) as match; else mobileCardPlaceholder">
            <div class="mobile-card-score">
              <strong [class.winning-team]="isBracketWinner(match, 'a')" [class.losing-team]="isBracketLoser(match, 'a')">
                {{ getTeamName(match.team_a) }}
              </strong>
              <span>{{ match.score_a }} - {{ match.score_b }}</span>
              <strong [class.winning-team]="isBracketWinner(match, 'b')" [class.losing-team]="isBracketLoser(match, 'b')">
                {{ getTeamName(match.team_b) }}
              </strong>
            </div>
            <small>{{ match.status }}</small>
          </ng-container>

          <ng-template #mobileCardPlaceholder>
            <div class="mobile-card-score placeholder">
              <strong>{{ slot.title }}</strong>
              <span>0 - 0</span>
            </div>
            <small>Scheduled</small>
          </ng-template>
        </button>
      </ng-template>

      <ng-template #officialBracketMatch let-match let-label="label" let-stage="stage">
        <div class="matchup-title">
          <span>{{ label }}</span>
          <strong>{{ getMatchFormatLabel(match) || match.status }}</strong>
        </div>
        <div class="official-bracket-score">
          <strong [class.winning-team]="isBracketWinner(match, 'a')" [class.losing-team]="isBracketLoser(match, 'a')">
            {{ getTeamName(match.team_a) }}
          </strong>
          <span>{{ match.score_a }} - {{ match.score_b }}</span>
          <strong [class.winning-team]="isBracketWinner(match, 'b')" [class.losing-team]="isBracketLoser(match, 'b')">
            {{ getTeamName(match.team_b) }}
          </strong>
        </div>
        <div class="official-meta">
          <span>{{ match.status }}</span>
          <span>{{ getCourtName(match) }}</span>
          <span>{{ formatMatchTime(match.scheduled_time) }}</span>
          <span>Ref: {{ match.referee_name || 'TBD' }}</span>
        </div>
        <div class="bracket-expanded-details" *ngIf="stage && expandedBracketStage === stage">
          <div><span>Format</span><strong>{{ getMatchFormatLabel(match) || 'Best of 1' }}</strong></div>
          <div><span>Status</span><strong>{{ match.status }}</strong></div>
          <div><span>Court</span><strong>{{ getCourtName(match) }}</strong></div>
          <div><span>Referee</span><strong>{{ match.referee_name || 'TBD' }}</strong></div>
          <div><span>Time</span><strong>{{ formatMatchTime(match.scheduled_time) }}</strong></div>
          <div><span>Series</span><strong>{{ getSeriesSummary(match) }}</strong></div>
        </div>
      </ng-template>

      <ng-template #placeholderBracketMatch let-label="label" let-title="title" let-format="format" let-stage="stage">
        <div class="matchup-title">
          <span>{{ label }}</span>
          <strong>{{ format }}</strong>
        </div>
        <div class="placeholder-bracket-score">
          <strong>{{ title }}</strong>
          <span>0 - 0</span>
        </div>
        <div class="official-meta">
          <span>Scheduled</span>
          <span>Court TBD</span>
          <span>Time TBD</span>
          <span>Ref: TBD</span>
        </div>
        <div class="bracket-expanded-details" *ngIf="stage && expandedBracketStage === stage">
          <div><span>Format</span><strong>{{ format }}</strong></div>
          <div><span>Status</span><strong>Scheduled</strong></div>
          <div><span>Court</span><strong>TBD</strong></div>
          <div><span>Referee</span><strong>TBD</strong></div>
        </div>
      </ng-template>

      <ng-template #teamSeed let-team>
        <div class="seed-number">#{{ team.seed || team.overallRank }}</div>
        <div class="seed-main">
          <strong>{{ team.teamName }}</strong>
          <small>{{ team.groupName }} - Overall rank {{ team.overallRank }}</small>
        </div>
        <div class="seed-stats">
          <span>{{ team.wins }}-{{ team.losses }}</span>
          <span>PF {{ team.pointsFor }}</span>
          <span>PA {{ team.pointsAgainst }}</span>
          <span>Diff {{ team.pointDifferential }}</span>
          <span>Rating {{ team.rating }}</span>
        </div>
      </ng-template>

      <ng-template #compactSeed let-team let-winner="winner">
        <div class="compact-seed-row" [class.projected-winner]="winner?.teamId === team.teamId">
          <span class="seed-pill">#{{ team.seed }}</span>
          <div>
            <strong>{{ team.teamName }}</strong>
            <small>{{ team.groupName }} - Overall {{ team.overallRank }} - {{ team.wins }}-{{ team.losses }} - Diff {{ team.pointDifferential }}</small>
          </div>
        </div>
      </ng-template>

      <ng-template #summaryMatch let-match>
        <div class="summary-match-meta">
          <span>{{ formatMatchTime(match.scheduled_time) }}</span>
          <span>{{ getCourtName(match) }}</span>
          <span>{{ match.status }}</span>
        </div>
        <h3>{{ getTeamName(match.team_a) }} vs {{ getTeamName(match.team_b) }}</h3>
        <p>
          <strong>{{ match.score_a }} - {{ match.score_b }}</strong>
          <span *ngIf="match.referee_name"> - Ref: {{ match.referee_name }}</span>
        </p>
      </ng-template>
    </article>

    <ng-template #loading>
      <article class="viewer-page">
        <div class="panel empty-state" *ngIf="viewerError; else loadingMessage">{{ viewerError }}</div>
        <ng-template #loadingMessage>
          <div class="panel empty-state">Loading tournament scoreboard...</div>
        </ng-template>
      </article>
    </ng-template>
  `,
  styles: [
    `
      .viewer-page {
        display: grid;
        gap: 0.9rem;
        max-width: 100%;
        overflow-x: hidden;
      }

      .viewer-hero h2 {
        margin-top: 0.25rem;
        font-size: clamp(1.55rem, 4vw, 2.5rem);
      }

      .viewer-status {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 0.5rem;
      }

      .trust-labels {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        margin-top: 0.75rem;
      }

      .trust-labels span {
        padding: 0.34rem 0.58rem;
        border: 1px solid rgba(20, 184, 166, 0.22);
        border-radius: 999px;
        background: rgba(20, 184, 166, 0.1);
        color: #ccfbf1;
        font-size: 0.72rem;
        font-weight: 900;
      }

      .read-only-pill,
      .viewer-link-pill {
        display: inline-flex;
        align-items: center;
        padding: 0.45rem 0.7rem;
        border: 1px solid rgba(20, 184, 166, 0.3);
        border-radius: 999px;
        background: rgba(20, 184, 166, 0.1);
        color: #99f6e4;
        font-size: 0.76rem;
        font-weight: 900;
        text-decoration: none;
      }

      .viewer-link-pill {
        border-color: rgba(37, 99, 235, 0.34);
        background: rgba(37, 99, 235, 0.14);
        color: #bfdbfe;
      }

      .viewer-summary {
        display: grid;
        gap: 0.75rem;
      }

      .summary-card {
        display: grid;
        gap: 0.38rem;
        min-width: 0;
        padding: 0.9rem;
        border: 1px solid var(--glass-border);
        border-radius: 1rem;
        background:
          linear-gradient(135deg, rgba(37, 99, 235, 0.12), transparent 56%),
          rgba(15, 23, 42, 0.56);
        box-shadow: var(--shadow);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      .summary-card.live-summary {
        border-color: rgba(245, 158, 11, 0.32);
        background:
          linear-gradient(135deg, rgba(245, 158, 11, 0.14), transparent 56%),
          rgba(30, 41, 59, 0.58);
      }

      .summary-card.muted-summary {
        background: rgba(15, 23, 42, 0.45);
      }

      .summary-card h3 {
        min-width: 0;
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--ink);
        font-size: 1rem;
      }

      .summary-card p {
        margin: 0;
        color: var(--muted);
        font-size: 0.82rem;
      }

      .summary-card p strong {
        color: var(--ink);
        font-size: 1rem;
      }

      .summary-match-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }

      .summary-match-meta span {
        padding: 0.24rem 0.45rem;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.55);
        color: var(--muted-strong);
        font-size: 0.72rem;
        font-weight: 850;
      }

      .viewer-tabs {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.5rem;
        padding: 0.35rem;
        border: 1px solid var(--glass-border);
        border-radius: 1rem;
        background: rgba(15, 23, 42, 0.48);
        box-shadow: 0 12px 28px rgba(2, 6, 23, 0.22);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        overscroll-behavior-inline: contain;
      }

      .viewer-tabs button,
      .viewer-tabs a {
        min-width: 0;
        min-height: 2.55rem;
        padding-inline: 0.45rem;
        border: 1px solid transparent;
        background: transparent;
        color: var(--muted);
        display: grid;
        place-items: center;
        border-radius: 0.8rem;
        font-weight: 900;
        text-decoration: none;
        transition:
          border-color 160ms ease,
          background 160ms ease,
          color 160ms ease,
          transform 160ms ease;
      }

      .viewer-tabs button.active {
        border-color: rgba(20, 184, 166, 0.36);
        background:
          linear-gradient(135deg, rgba(37, 99, 235, 0.38), rgba(20, 184, 166, 0.22)),
          rgba(15, 23, 42, 0.45);
        color: var(--ink);
      }

      .match-section {
        display: grid;
        gap: 0.56rem;
      }

      .match-section h3 {
        margin: 0;
        color: var(--ink);
        font-size: 1rem;
      }

      .match-section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
      }

      .match-section-heading span {
        color: var(--muted);
        font-size: 0.78rem;
        font-weight: 900;
      }

      .standings-section,
      .groups-section {
        display: grid;
        gap: 0.75rem;
      }

      .projection-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        min-width: 0;
      }

      .legend-item {
        max-width: 100%;
        padding: 0.38rem 0.58rem;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.48);
        color: var(--muted-strong);
        font-size: 0.74rem;
        font-weight: 850;
      }

      .legend-item.champions {
        border-color: rgba(20, 184, 166, 0.34);
        color: #99f6e4;
      }

      .legend-item.premier {
        border-color: rgba(37, 99, 235, 0.34);
        color: #bfdbfe;
      }

      .legend-item.eliminated {
        border-color: rgba(239, 68, 68, 0.3);
        color: #fecaca;
      }

      .legend-item.pending {
        border-color: rgba(148, 163, 184, 0.22);
        color: var(--muted-strong);
      }

      .groups-grid {
        display: grid;
        gap: 0.75rem;
      }

      .group-projection-card {
        display: grid;
        gap: 0.72rem;
        min-width: 0;
        padding: 0.88rem;
        border: 1px solid var(--glass-border);
        border-radius: 1rem;
        background: rgba(15, 23, 42, 0.54);
        box-shadow: var(--shadow);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      .group-card-top,
      .team-row-main {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
        min-width: 0;
      }

      .group-card-top h4 {
        margin: 0.12rem 0 0;
        color: var(--ink);
        font-size: 1rem;
      }

      .group-card-top > span {
        flex: 0 0 auto;
        padding: 0.3rem 0.5rem;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.5);
        color: var(--muted);
        font-size: 0.72rem;
        font-weight: 900;
      }

      .group-team-list {
        display: grid;
        gap: 0.55rem;
      }

      .group-team-row {
        display: grid;
        gap: 0.5rem;
        min-width: 0;
        padding: 0.7rem;
        border: 1px solid var(--line);
        border-radius: 0.9rem;
        background: rgba(15, 23, 42, 0.44);
        box-shadow: inset 3px 0 0 rgba(148, 163, 184, 0.24);
      }

      .group-team-row.champions {
        border-color: rgba(20, 184, 166, 0.3);
        box-shadow: inset 3px 0 0 rgba(20, 184, 166, 0.82);
      }

      .group-team-row.premier {
        border-color: rgba(37, 99, 235, 0.28);
        box-shadow: inset 3px 0 0 rgba(37, 99, 235, 0.82);
      }

      .group-team-row.eliminated {
        border-color: rgba(239, 68, 68, 0.26);
        box-shadow: inset 3px 0 0 rgba(239, 68, 68, 0.68);
        opacity: 0.82;
      }

      .team-row-main strong {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--ink);
        font-size: 0.92rem;
      }

      .projection-badge {
        flex: 0 0 auto;
        max-width: 9rem;
        padding: 0.28rem 0.45rem;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.12);
        color: var(--muted-strong);
        font-size: 0.66rem;
        font-weight: 950;
        text-align: center;
        text-transform: uppercase;
      }

      .champions .projection-badge {
        background: rgba(20, 184, 166, 0.14);
        color: #99f6e4;
      }

      .premier .projection-badge {
        background: rgba(37, 99, 235, 0.16);
        color: #bfdbfe;
      }

      .eliminated .projection-badge {
        background: rgba(239, 68, 68, 0.12);
        color: #fecaca;
      }

      .team-row-stats {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        min-width: 0;
      }

      .team-row-stats span {
        padding: 0.25rem 0.42rem;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.5);
        color: var(--muted);
        font-size: 0.68rem;
        font-weight: 850;
      }

      .bracket-section,
      .eliminated-section {
        display: grid;
        gap: 0.75rem;
        min-width: 0;
      }

      .section-title {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
        min-width: 0;
      }

      .section-title h3 {
        margin: 0.12rem 0 0;
      }

      .section-title p:not(.kicker) {
        max-width: 44rem;
        margin: 0.35rem 0 0;
      }

      .section-title span {
        color: var(--muted);
        font-size: 0.8rem;
        font-weight: 900;
      }

      .compact-title {
        margin-top: 0.25rem;
      }

      .progression-summary {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        min-width: 0;
      }

      .progression-summary span,
      .bracket-intro > span {
        max-width: 100%;
        padding: 0.38rem 0.58rem;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.5);
        color: var(--muted);
        font-size: 0.76rem;
        font-weight: 850;
      }

      .league-switch {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.5rem;
      }

      .league-switch button {
        min-width: 0;
        border: 1px solid var(--line);
        background: rgba(30, 41, 59, 0.76);
        color: var(--muted);
      }

      .league-switch button.active {
        border-color: rgba(20, 184, 166, 0.38);
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.38), rgba(20, 184, 166, 0.22));
        color: var(--ink);
      }

      .bracket-intro {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
        min-width: 0;
        padding: 0.85rem;
        border: 1px solid var(--glass-border);
        border-radius: 1rem;
        background: rgba(15, 23, 42, 0.54);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      .bracket-intro h4 {
        margin: 0.12rem 0 0;
        color: var(--ink);
        font-size: 1rem;
      }

      .bracket-intro p:not(.kicker) {
        max-width: 42rem;
        margin: 0.35rem 0 0;
        color: var(--muted);
        font-size: 0.84rem;
      }

      .seed-list,
      .matchup-grid {
        display: grid;
        gap: 0.65rem;
      }

      .bracket-board {
        display: grid;
        gap: 0.8rem;
        min-width: 0;
      }

      .bracket-round {
        display: grid;
        gap: 0.65rem;
        min-width: 0;
      }

      .round-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .round-heading span,
      .projected-badge {
        padding: 0.28rem 0.48rem;
        border-radius: 999px;
        background: rgba(20, 184, 166, 0.12);
        color: #99f6e4;
        font-size: 0.68rem;
        font-weight: 950;
        text-transform: uppercase;
      }

      .round-heading h4 {
        margin: 0;
        color: var(--ink);
        font-size: 0.95rem;
      }

      .bracket-match,
      .champion-card {
        position: relative;
        display: grid;
        gap: 0.5rem;
        min-width: 0;
        padding: 0.75rem;
        border: 1px solid rgba(20, 184, 166, 0.18);
        border-radius: 1rem;
        background:
          linear-gradient(135deg, rgba(37, 99, 235, 0.1), transparent 48%),
          rgba(15, 23, 42, 0.56);
        box-shadow: 0 14px 34px rgba(2, 6, 23, 0.28);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      .compact-seed-row {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 0.58rem;
        align-items: center;
        min-width: 0;
        padding: 0.58rem;
        border: 1px solid var(--line);
        border-radius: 0.8rem;
        background: rgba(30, 41, 59, 0.78);
      }

      .compact-seed-row strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--ink);
        font-size: 0.9rem;
      }

      .compact-seed-row small {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--muted);
        font-size: 0.68rem;
        font-weight: 850;
      }

      .compact-seed-row.projected-winner {
        border-color: rgba(20, 184, 166, 0.36);
        background:
          linear-gradient(135deg, rgba(20, 184, 166, 0.14), transparent 54%),
          rgba(30, 41, 59, 0.9);
        box-shadow: inset 3px 0 0 rgba(20, 184, 166, 0.78);
      }

      .compact-seed-row.projected-winner .seed-pill {
        background: rgba(20, 184, 166, 0.24);
        color: #ccfbf1;
      }

      .advance-tag {
        grid-column: 1 / -1;
        justify-self: start;
        padding: 0.22rem 0.42rem;
        border-radius: 999px;
        background: rgba(37, 99, 235, 0.2);
        color: #bfdbfe;
        font-size: 0.66rem;
        font-weight: 950;
        text-transform: uppercase;
      }

      .seed-pill {
        display: grid;
        place-items: center;
        width: 2rem;
        height: 2rem;
        border-radius: 0.65rem;
        background: rgba(20, 184, 166, 0.14);
        color: #99f6e4;
        font-size: 0.78rem;
        font-weight: 950;
      }

      .projected-slot,
      .open-slot {
        min-width: 0;
        padding: 0.72rem;
        border: 1px dashed var(--line-strong);
        border-radius: 0.85rem;
        color: var(--muted);
        background: rgba(15, 23, 42, 0.35);
        font-size: 0.82rem;
        font-weight: 850;
      }

      .projected-match {
        align-content: center;
      }

      .champion-card {
        min-height: 8rem;
        align-content: center;
        justify-items: start;
        border-color: rgba(245, 158, 11, 0.28);
        background:
          linear-gradient(135deg, rgba(245, 158, 11, 0.16), transparent 50%),
          rgba(15, 23, 42, 0.6);
      }

      .champion-card strong {
        color: var(--ink);
        font-size: 1.05rem;
      }

      .champion-card small {
        color: var(--muted);
        font-weight: 850;
      }

      .champion-card .compact-seed-row {
        width: 100%;
      }

      .seed-details {
        display: grid;
        gap: 0.65rem;
        padding: 0.75rem;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: rgba(15, 23, 42, 0.24);
      }

      .seed-details summary {
        cursor: pointer;
        color: var(--ink);
        font-size: 0.9rem;
        font-weight: 900;
      }

      .seed-details .seed-list {
        margin-top: 0.65rem;
      }

      .seed-card,
      .matchup-team {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 0.65rem;
        padding: 0.75rem;
        border: 1px solid var(--glass-border);
        border-radius: 0.95rem;
        background: rgba(15, 23, 42, 0.54);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
      }

      .seed-number {
        display: grid;
        place-items: center;
        width: 2.35rem;
        min-height: 2.35rem;
        border-radius: 0.75rem;
        background: rgba(20, 184, 166, 0.14);
        color: #99f6e4;
        font-size: 0.82rem;
        font-weight: 950;
      }

      .seed-main {
        min-width: 0;
        display: grid;
        gap: 0.16rem;
      }

      .seed-main strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--ink);
      }

      .seed-main small {
        color: var(--muted);
        font-size: 0.72rem;
        font-weight: 850;
      }

      .seed-stats {
        grid-column: 1 / -1;
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }

      .seed-stats span {
        padding: 0.26rem 0.45rem;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.55);
        color: var(--muted);
        font-size: 0.68rem;
        font-weight: 850;
      }

      .matchup-card {
        display: grid;
        gap: 0.55rem;
        padding: 0.85rem;
        border: 1px solid rgba(20, 184, 166, 0.18);
        border-radius: 1rem;
        background:
          linear-gradient(135deg, rgba(37, 99, 235, 0.1), transparent 48%),
          rgba(17, 24, 39, 0.78);
      }

      .matchup-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .matchup-title span {
        color: var(--teal);
        font-size: 0.72rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .matchup-title strong {
        color: var(--muted);
        font-size: 0.78rem;
      }

      .matchup-divider {
        justify-self: center;
        color: var(--muted);
        font-size: 0.72rem;
        font-weight: 950;
        text-transform: uppercase;
      }

      .open-slot {
        min-height: 3rem;
      }

      .muted-seed {
        opacity: 0.76;
      }

      .standings-list {
        display: grid;
        gap: 0.65rem;
      }

      .public-match-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.75rem;
        border: 1px solid var(--glass-border);
        border-radius: 1rem;
        background: rgba(15, 23, 42, 0.5);
        box-shadow: 0 12px 28px rgba(2, 6, 23, 0.22);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      .public-match-toolbar strong {
        color: var(--ink);
        font-size: 0.92rem;
      }

      .match-view-toggle {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
      }

      .match-view-toggle button {
        min-height: 2.5rem;
        padding: 0.55rem 0.85rem;
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.52);
        color: var(--muted);
        font-size: 0.82rem;
        font-weight: 900;
      }

      .match-view-toggle button.active {
        border-color: rgba(20, 184, 166, 0.4);
        background:
          linear-gradient(135deg, rgba(37, 99, 235, 0.34), rgba(20, 184, 166, 0.22)),
          rgba(15, 23, 42, 0.56);
        color: var(--ink);
      }

      .standing-card {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 0.75rem;
        padding: 0.85rem;
        border: 1px solid var(--glass-border);
        border-radius: 1rem;
        background: rgba(15, 23, 42, 0.54);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
      }

      .tiebreak-rules {
        margin-bottom: 0.85rem;
        border: 1px solid var(--glass-border);
        border-radius: 1rem;
        background: rgba(15, 23, 42, 0.42);
        overflow: hidden;
      }

      .tiebreak-rules summary {
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.8rem 0.9rem;
        color: var(--ink);
        cursor: pointer;
        font-size: 0.86rem;
        font-weight: 900;
        list-style-position: inside;
      }

      .tiebreak-rules summary small {
        color: var(--muted);
        font-size: 0.68rem;
        font-weight: 850;
        text-transform: uppercase;
      }

      .tiebreak-rules ol {
        margin: 0;
        padding: 0 1.2rem 0.8rem 2.1rem;
        color: var(--text);
        font-size: 0.8rem;
        line-height: 1.55;
      }

      .tiebreak-rules p {
        margin: -0.2rem 0 0;
        padding: 0 0.9rem 0.9rem;
        color: var(--muted);
        font-size: 0.76rem;
        line-height: 1.45;
      }

      .rank-block {
        display: grid;
        place-items: center;
        align-content: center;
        width: 3rem;
        min-height: 3rem;
        border-radius: 0.85rem;
        background: rgba(37, 99, 235, 0.18);
      }

      .rank-block strong {
        color: var(--ink);
        font-size: 1.25rem;
        line-height: 1;
      }

      .rank-block span,
      .standing-main small {
        color: var(--muted);
        font-size: 0.68rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .standing-main {
        min-width: 0;
        display: grid;
        gap: 0.25rem;
      }

      .standing-main > strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--ink);
      }

      .tie-note {
        justify-self: start;
        padding: 0.25rem 0.45rem;
        border: 1px solid rgba(20, 184, 166, 0.22);
        border-radius: 999px;
        background: rgba(20, 184, 166, 0.1);
        color: #b8fff3 !important;
        text-transform: none !important;
      }

      .standing-stats {
        grid-column: 1 / -1;
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.45rem;
      }

      .standing-stats span {
        min-width: 0;
        padding: 0.45rem 0.5rem;
        border-radius: 0.75rem;
        background: rgba(15, 23, 42, 0.48);
        color: var(--muted);
        font-size: 0.72rem;
        font-weight: 850;
        text-align: center;
      }

      .standing-stats strong {
        display: block;
        color: var(--ink);
        font-size: 0.95rem;
      }

      .standing-stats .primary-stat {
        background: rgba(37, 99, 235, 0.18);
        color: var(--text);
      }

      .match-grid {
        display: grid;
        gap: 0.48rem;
      }

      .viewer-card {
        display: grid;
        gap: 0.58rem;
        padding: 0.9rem;
        border: 1px solid var(--glass-border);
        border-radius: 1rem;
        background: rgba(15, 23, 42, 0.56);
        box-shadow: 0 14px 34px rgba(2, 6, 23, 0.25);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
      }

      .viewer-card::before {
        content: "";
        width: 3rem;
        height: 0.22rem;
        border-radius: 999px;
        background: linear-gradient(90deg, var(--accent), var(--teal));
      }

      .viewer-card.live {
        border-color: rgba(245, 158, 11, 0.38);
        box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.12);
      }

      .viewer-card.completed {
        opacity: 0.86;
      }

      .match-row-card {
        position: relative;
        gap: 0;
        padding: 0.58rem 0.68rem 0.58rem 0.82rem;
        cursor: pointer;
        overflow: hidden;
        box-shadow: 0 10px 24px rgba(2, 6, 23, 0.2);
        transition:
          border-color 160ms ease,
          background 160ms ease,
          transform 160ms ease,
          box-shadow 160ms ease;
      }

      .match-row-card::before {
        position: absolute;
        inset: 0 auto 0 0;
        width: 0.18rem;
        height: auto;
        border-radius: 0;
      }

      .match-row-card:hover {
        transform: translateY(-1px);
        border-color: rgba(148, 163, 184, 0.24);
      }

      .match-row-card:focus-visible {
        outline: 2px solid rgba(20, 184, 166, 0.6);
        outline-offset: 2px;
      }

      .match-row-card.expanded {
        border-color: rgba(20, 184, 166, 0.34);
        background:
          linear-gradient(135deg, rgba(20, 184, 166, 0.08), transparent 42%),
          rgba(15, 23, 42, 0.6);
      }

      .match-row-main {
        display: grid;
        grid-template-columns: 4.1rem minmax(0, 1fr) minmax(4.7rem, auto) minmax(0, 1fr) auto;
        align-items: center;
        gap: 0.55rem;
        min-width: 0;
      }

      .match-row-status {
        display: grid;
        align-content: center;
        gap: 0.08rem;
        min-width: 0;
      }

      .match-row-status strong {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: fit-content;
        min-width: 2.25rem;
        padding: 0.14rem 0.34rem;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.12);
        color: var(--ink);
        font-size: 0.74rem;
        font-weight: 950;
        line-height: 1.05;
      }

      .live .match-row-status strong {
        background: rgba(245, 158, 11, 0.18);
        color: #fcd34d;
      }

      .completed .match-row-status strong {
        background: rgba(34, 197, 94, 0.12);
        color: #bbf7d0;
      }

      .match-row-status span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--muted);
        font-size: 0.64rem;
        font-weight: 850;
      }

      .match-row-team {
        min-width: 0;
        color: var(--ink);
        font-size: 0.91rem;
        font-weight: 900;
      }

      .match-row-team span {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .match-row-team.away {
        text-align: right;
      }

      .match-row-score {
        min-width: 4.7rem;
        padding: 0.24rem 0.42rem;
        border-radius: 0.68rem;
        background: rgba(2, 6, 23, 0.32);
        color: var(--ink);
        font-size: 1.02rem;
        font-weight: 950;
        text-align: center;
        white-space: nowrap;
        letter-spacing: 0;
      }

      .compact-court {
        max-width: 7rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding: 0.24rem 0.44rem;
        border: 1px solid rgba(148, 163, 184, 0.14);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.42);
        color: var(--muted-strong);
        font-size: 0.68rem;
        font-weight: 900;
      }

      .match-expanded-details {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.38rem;
        margin-top: 0.5rem;
        padding-top: 0.5rem;
        border-top: 1px solid rgba(148, 163, 184, 0.14);
      }

      .match-expanded-details div {
        min-width: 0;
        padding: 0.42rem 0.48rem;
        border: 1px solid rgba(148, 163, 184, 0.1);
        border-radius: 0.68rem;
        background: rgba(15, 23, 42, 0.34);
      }

      .match-expanded-details span,
      .match-expanded-details strong {
        display: block;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .match-expanded-details span {
        color: var(--muted);
        font-size: 0.58rem;
        font-weight: 900;
        text-transform: uppercase;
      }

      .match-expanded-details strong {
        margin-top: 0.1rem;
        color: var(--ink);
        font-size: 0.74rem;
        font-weight: 900;
      }

      .card-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        color: var(--muted);
        font-size: 0.78rem;
        font-weight: 800;
      }

      .card-meta span {
        padding: 0.28rem 0.5rem;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.5);
      }

      .official-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
      }

      .official-meta span {
        min-width: 0;
        padding: 0.34rem 0.55rem;
        border: 1px solid rgba(148, 163, 184, 0.14);
        border-radius: 0.75rem;
        background: rgba(15, 23, 42, 0.42);
        color: var(--muted-strong);
        font-size: 0.76rem;
        font-weight: 850;
      }

      .badge {
        color: #bfdbfe;
      }

      .live .badge {
        color: #fcd34d;
      }

      .completed .badge {
        color: #bbf7d0;
      }

      .team-line {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(2.4rem, auto);
        align-items: center;
        gap: 0.75rem;
      }

      .team-line strong {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--ink);
        font-size: 1rem;
      }

      .team-line span {
        min-width: 2.4rem;
        color: var(--ink);
        font-size: 1.65rem;
        font-weight: 950;
        text-align: right;
      }

      .compact-scoreline {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        align-items: center;
        gap: 0.5rem;
      }

      .compact-scoreline strong {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--ink);
        font-size: 0.98rem;
        font-weight: 850;
      }

      .compact-scoreline strong:last-child {
        text-align: right;
      }

      .compact-scoreline span {
        min-width: 4.6rem;
        padding: 0.28rem 0.5rem;
        border-radius: 0.75rem;
        background: rgba(15, 23, 42, 0.58);
        color: var(--ink);
        font-size: 1.2rem;
        font-weight: 950;
        text-align: center;
      }

      .official-bracket-score {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        align-items: center;
        gap: 0.38rem;
      }

      .official-bracket-score strong {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--ink);
        font-size: 0.84rem;
        line-height: 1.15;
      }

      .official-bracket-score strong:last-child {
        text-align: right;
      }

      .official-bracket-score .winning-team {
        color: var(--ink);
        font-weight: 950;
      }

      .official-bracket-score .losing-team {
        color: rgba(203, 213, 225, 0.54);
        text-decoration: line-through;
        text-decoration-thickness: 0.08em;
        text-decoration-color: rgba(203, 213, 225, 0.5);
      }

      .official-bracket-score span {
        padding: 0.22rem 0.38rem;
        border-radius: 0.65rem;
        background: rgba(15, 23, 42, 0.6);
        color: var(--ink);
        font-size: 0.86rem;
        font-weight: 950;
      }

      .bracket-arena {
        gap: clamp(0.7rem, 1.2vw, 1rem);
        padding: clamp(0.7rem, 1.4vw, 1rem);
        border: 1px solid rgba(20, 184, 166, 0.18);
        border-radius: 1.2rem;
        background:
          radial-gradient(circle at 50% 20%, rgba(20, 184, 166, 0.1), transparent 34%),
          linear-gradient(135deg, rgba(2, 6, 23, 0.42), rgba(15, 23, 42, 0.34));
        overflow: visible;
      }

      .official-bracket-layout {
        min-width: 0;
      }

      .desktop-knockout-board {
        display: grid;
        grid-template-columns:
          minmax(0, 1.55fr)
          minmax(0, 0.9fr)
          minmax(0, 1.55fr);
        align-items: center;
        gap: clamp(1rem, 1.6vw, 1.35rem);
        min-width: 0;
        padding: clamp(0.75rem, 1.35vw, 1rem);
        border: 1px solid rgba(20, 184, 166, 0.18);
        border-radius: 1.15rem;
        background:
          radial-gradient(circle at 50% 50%, rgba(20, 184, 166, 0.08), transparent 34%),
          linear-gradient(135deg, rgba(2, 6, 23, 0.44), rgba(15, 23, 42, 0.36));
      }

      .bracket-pair {
        position: relative;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr);
        grid-template-rows: auto auto;
        align-items: center;
        gap: 0.68rem 0.82rem;
        min-width: 0;
      }

      .bracket-pair-right {
        grid-template-columns: minmax(0, 0.9fr) minmax(0, 1fr);
      }

      .bracket-pair-left::after,
      .bracket-pair-right::before {
        content: "";
        position: absolute;
        top: 55%;
        width: 0.85rem;
        border-top: 1px solid rgba(20, 184, 166, 0.3);
      }

      .bracket-pair-left::after {
        right: -0.85rem;
      }

      .bracket-pair-right::before {
        left: -0.85rem;
      }

      .qf-heading,
      .sf-heading {
        align-self: end;
      }

      .bracket-pair-left .qf-heading,
      .bracket-pair-left .qf-pair-stack {
        grid-column: 1;
      }

      .bracket-pair-left .sf-heading,
      .bracket-pair-left .semifinal-node {
        grid-column: 2;
      }

      .bracket-pair-right .sf-heading,
      .bracket-pair-right .semifinal-node {
        grid-column: 1;
      }

      .bracket-pair-right .qf-heading,
      .bracket-pair-right .qf-pair-stack {
        grid-column: 2;
      }

      .qf-pair-stack {
        display: grid;
        gap: 0.78rem;
        min-width: 0;
      }

      .semifinal-node {
        align-self: center;
      }

      .bracket-column {
        position: relative;
        display: grid;
        align-content: center;
        gap: 0.72rem;
        min-width: 0;
      }

      .bracket-column:not(:last-child)::after {
        content: "";
        position: absolute;
        top: 50%;
        right: -0.72rem;
        width: 0.72rem;
        border-top: 1px solid rgba(20, 184, 166, 0.28);
      }

      .desktop-knockout-board > .bracket-column::after {
        display: none;
      }

      .qf-column {
        gap: 0.78rem;
      }

      .semifinal-column {
        gap: 0.9rem;
      }

      .final-column {
        gap: 0.72rem;
      }

      .bracket-node {
        min-width: 0;
        padding: 0.62rem;
        border-radius: 0.88rem;
      }

      .bracket-node-body {
        display: grid;
        gap: 0.42rem;
        min-width: 0;
        cursor: pointer;
      }

      .bracket-node-body:focus-visible {
        outline: 2px solid rgba(20, 184, 166, 0.58);
        outline-offset: 3px;
        border-radius: 0.7rem;
      }

      .bracket-node .official-meta {
        display: none;
      }

      .bracket-node-body.expanded .official-meta {
        display: flex;
      }

      .mobile-knockout-track {
        display: none;
      }

      .mobile-bracket-detail-panel {
        display: none;
      }

      .bracket-lane,
      .bracket-center-lane {
        display: grid;
        gap: 0.68rem;
        min-width: 0;
      }

      .bracket-center-lane {
        align-content: center;
      }

      .bracket-lane .round-heading,
      .bracket-center-lane .round-heading {
        min-height: 2.45rem;
        align-content: end;
      }

      .placeholder-bracket-score {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 0.45rem;
        padding: 0.2rem 0;
      }

      .placeholder-bracket-score strong {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: normal;
        color: var(--ink);
        font-size: 0.82rem;
        line-height: 1.35;
      }

      .placeholder-bracket-score span {
        color: var(--ink);
        font-weight: 950;
      }

      .center-final {
        border-color: rgba(245, 158, 11, 0.48);
        background:
          linear-gradient(135deg, rgba(245, 158, 11, 0.12), transparent 56%),
          rgba(15, 23, 42, 0.68);
      }

      .third-place-match {
        opacity: 0.94;
      }

      .compact-champion {
        min-height: auto;
        padding: 0.85rem;
      }

      .bracket-expanded-details {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.38rem;
        padding-top: 0.45rem;
        border-top: 1px solid rgba(148, 163, 184, 0.14);
      }

      .bracket-expanded-details div {
        min-width: 0;
        padding: 0.38rem 0.42rem;
        border: 1px solid rgba(148, 163, 184, 0.1);
        border-radius: 0.66rem;
        background: rgba(2, 6, 23, 0.24);
      }

      .bracket-expanded-details span,
      .bracket-expanded-details strong {
        display: block;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .bracket-expanded-details span {
        color: var(--muted);
        font-size: 0.56rem;
        font-weight: 950;
        text-transform: uppercase;
      }

      .bracket-expanded-details strong {
        margin-top: 0.1rem;
        color: var(--ink);
        font-size: 0.72rem;
        font-weight: 900;
      }

      @media (min-width: 860px) {
        .match-grid {
          grid-template-columns: minmax(0, 1fr);
        }

        .viewer-summary {
          grid-template-columns: 1.3fr 1.3fr 0.8fr;
          align-items: stretch;
        }

        .groups-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .standing-card {
          grid-template-columns: auto minmax(12rem, 1fr) minmax(22rem, 1.7fr);
          align-items: center;
        }

        .standing-stats {
          grid-column: auto;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .bracket-board {
          grid-template-columns: 1.55fr 1fr 1fr 1fr 0.85fr;
          align-items: center;
        }

        .bracket-round {
          position: relative;
        }

        .bracket-round:not(:last-child)::after {
          content: "";
          position: absolute;
          top: 50%;
          right: -0.55rem;
          width: 0.55rem;
          border-top: 1px solid rgba(20, 184, 166, 0.28);
        }

        .bracket-round:not(:last-child) .bracket-match::after {
          content: "";
          position: absolute;
          top: 50%;
          right: -0.8rem;
          width: 0.8rem;
          border-top: 1px solid rgba(20, 184, 166, 0.34);
        }

        .bracket-round:nth-child(1)::before,
        .bracket-round:nth-child(2)::before {
          content: "";
          position: absolute;
          top: 22%;
          bottom: 22%;
          right: -0.82rem;
          border-right: 1px solid rgba(20, 184, 166, 0.24);
        }

        .bracket-round:nth-child(2) {
          gap: 1.6rem;
        }

        .bracket-round:nth-child(3),
        .bracket-round:nth-child(4),
        .champion-round {
          gap: 2.4rem;
        }

        .seed-list {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .matchup-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: start;
        }

        .official-board.bracket-arena {
          grid-template-columns: minmax(13rem, 1.25fr) minmax(11.5rem, 0.95fr) minmax(13rem, 1fr) minmax(11.5rem, 0.95fr) minmax(13rem, 1.25fr);
          align-items: center;
        }

        .qf-lane {
          grid-template-rows: auto repeat(2, minmax(8.8rem, auto));
          gap: 0.8rem;
        }

        .sf-lane {
          align-content: center;
          min-height: 28rem;
        }

        .left-lane,
        .right-lane {
          position: relative;
        }

        .connector-right::after,
        .connector-left::before {
          content: "";
          position: absolute;
          top: 50%;
          width: 0.9rem;
          border-top: 2px solid rgba(20, 184, 166, 0.74);
        }

        .connector-right::after {
          right: -0.9rem;
        }

        .connector-left::before {
          left: -0.9rem;
        }

        .qf-lane::after,
        .qf-lane::before {
          content: "";
          position: absolute;
          width: 0.9rem;
          height: 5.9rem;
          top: 47%;
          transform: translateY(-50%);
        }

        .qf-lane.left-lane::after {
          right: -0.9rem;
          border-right: 2px solid rgba(20, 184, 166, 0.62);
          border-top: 2px solid rgba(20, 184, 166, 0.62);
          border-bottom: 2px solid rgba(20, 184, 166, 0.62);
        }

        .qf-lane.right-lane::before {
          left: -0.9rem;
          border-left: 2px solid rgba(20, 184, 166, 0.62);
          border-top: 2px solid rgba(20, 184, 166, 0.62);
          border-bottom: 2px solid rgba(20, 184, 166, 0.62);
        }

        .bracket-center-lane {
          gap: 0.95rem;
        }
      }

      @media (max-width: 767px) {
        .viewer-page {
          gap: 0.72rem;
        }

        .viewer-hero {
          gap: 0.65rem;
          padding: 0.85rem;
        }

        .viewer-hero h2 {
          margin-top: 0.18rem;
          font-size: 1.32rem;
          line-height: 1.1;
        }

        .viewer-hero p {
          margin-top: 0.22rem;
          font-size: 0.82rem;
        }

        .trust-labels {
          gap: 0.32rem;
          margin-top: 0.55rem;
        }

        .trust-labels span,
        .read-only-pill,
        .viewer-link-pill {
          padding: 0.3rem 0.5rem;
          font-size: 0.66rem;
        }

        .viewer-summary {
          gap: 0.55rem;
        }

        .summary-card {
          gap: 0.26rem;
          padding: 0.72rem;
        }

        .section-title,
        .bracket-intro {
          align-items: flex-start;
          flex-direction: column;
          gap: 0.55rem;
        }

        .section-title > span {
          max-width: 100%;
        }

        .progression-summary {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
        }

        .progression-summary span {
          white-space: normal;
        }

        .official-board.bracket-arena,
        .desktop-knockout-board {
          display: none;
        }

        .mobile-knockout-track {
          display: flex;
          gap: 0.75rem;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          box-sizing: border-box;
          padding: 0.08rem 0.85rem 0.75rem 0;
          overflow-x: auto;
          overflow-y: hidden;
          overscroll-behavior-inline: contain;
          scroll-snap-type: x mandatory;
          scroll-padding-inline: 0 0.85rem;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        .mobile-knockout-track::-webkit-scrollbar {
          display: none;
        }

        .mobile-bracket-round {
          position: relative;
          flex: 0 0 min(300px, calc(100vw - 2rem));
          display: grid;
          align-content: start;
          gap: 0.56rem;
          min-width: 0;
          max-width: min(300px, calc(100vw - 2rem));
          box-sizing: border-box;
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }

        .mobile-semifinal-round {
          grid-template-rows: auto repeat(2, minmax(13.15rem, auto));
        }

        .mobile-semi-pair-slot {
          display: grid;
          align-items: center;
          min-height: 13.15rem;
        }

        .mobile-bracket-round:not(:last-child)::after {
          display: none;
        }

        .mobile-knockout-card {
          display: grid;
          gap: 0.34rem;
          width: 100%;
          min-height: 5.55rem;
          padding: 0.52rem;
          border: 1px solid rgba(20, 184, 166, 0.18);
          border-radius: 0.9rem;
          background:
            linear-gradient(135deg, rgba(37, 99, 235, 0.08), transparent 52%),
            rgba(15, 23, 42, 0.72);
          box-shadow: 0 10px 22px rgba(2, 6, 23, 0.22);
          color: var(--ink);
          text-align: left;
          cursor: pointer;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            transform 160ms ease;
        }

        .mobile-knockout-card.selected {
          border-color: rgba(20, 184, 166, 0.48);
          background:
            linear-gradient(135deg, rgba(20, 184, 166, 0.12), transparent 56%),
            rgba(15, 23, 42, 0.82);
        }

        .mobile-knockout-card.final-card {
          border-color: rgba(245, 158, 11, 0.46);
          background:
            linear-gradient(135deg, rgba(245, 158, 11, 0.1), transparent 58%),
            rgba(15, 23, 42, 0.76);
        }

        .mobile-knockout-card.third-card {
          opacity: 0.9;
        }

        .mobile-knockout-card:focus-visible {
          outline: 2px solid rgba(20, 184, 166, 0.58);
          outline-offset: 2px;
        }

        .mobile-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .mobile-card-top span {
          color: var(--teal);
          font-size: 0.64rem;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .mobile-card-top strong,
        .mobile-knockout-card small {
          color: var(--muted);
          font-size: 0.64rem;
          font-weight: 900;
        }

        .mobile-card-score {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          align-items: center;
          gap: 0.32rem;
          min-width: 0;
        }

        .mobile-card-score strong {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--ink);
          font-size: 0.8rem;
          font-weight: 900;
        }

        .mobile-card-score strong:last-child {
          text-align: right;
        }

        .mobile-card-score span {
          padding: 0.18rem 0.32rem;
          border-radius: 0.62rem;
          background: rgba(2, 6, 23, 0.36);
          color: var(--ink);
          font-size: 0.8rem;
          font-weight: 950;
          white-space: nowrap;
        }

        .mobile-card-score.placeholder {
          grid-template-columns: minmax(0, 1fr) auto;
        }

        .mobile-card-score.placeholder strong:last-child {
          text-align: left;
        }

        .mobile-card-score .winning-team {
          color: var(--ink);
          font-weight: 950;
        }

        .mobile-card-score .losing-team {
          color: rgba(203, 213, 225, 0.54);
          text-decoration: line-through;
          text-decoration-thickness: 0.08em;
          text-decoration-color: rgba(203, 213, 225, 0.5);
        }

        .mobile-round-title {
          position: relative;
          display: grid;
          gap: 0.18rem;
          padding: 0.2rem 0.1rem 0.1rem;
        }

        .mobile-round-title span {
          width: fit-content;
          padding: 0.2rem 0.42rem;
          border-radius: 999px;
          background: rgba(20, 184, 166, 0.1);
          color: #99f6e4;
          font-size: 0.6rem;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .mobile-round-title h4 {
          margin: 0;
          color: var(--ink);
          font-size: 0.95rem;
        }

        .mobile-placement-title {
          margin-top: 0.3rem;
        }

        .mobile-bracket-match {
          width: 100%;
          box-sizing: border-box;
          gap: 0.34rem;
          min-height: 5.65rem;
          padding: 0.5rem;
          border-radius: 0.9rem;
          background:
            linear-gradient(135deg, rgba(37, 99, 235, 0.08), transparent 52%),
            rgba(15, 23, 42, 0.72);
          box-shadow: 0 10px 22px rgba(2, 6, 23, 0.22);
          cursor: pointer;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            transform 160ms ease;
        }

        .mobile-bracket-match:focus-visible {
          outline: 2px solid rgba(20, 184, 166, 0.58);
          outline-offset: 2px;
        }

        .mobile-bracket-match.expanded {
          border-color: rgba(20, 184, 166, 0.42);
          background:
            linear-gradient(135deg, rgba(20, 184, 166, 0.1), transparent 52%),
            rgba(15, 23, 42, 0.78);
        }

        .mobile-bracket-match .bracket-node-body {
          gap: 0.32rem;
        }

        .mobile-bracket-match .matchup-title {
          gap: 0.4rem;
        }

        .mobile-bracket-match .matchup-title span {
          font-size: 0.64rem;
        }

        .mobile-bracket-match .matchup-title strong {
          font-size: 0.66rem;
        }

        .mobile-bracket-match .official-bracket-score {
          gap: 0.28rem;
        }

        .mobile-bracket-match .official-bracket-score strong {
          font-size: 0.78rem;
        }

        .mobile-bracket-match .official-bracket-score span {
          padding: 0.18rem 0.3rem;
          font-size: 0.78rem;
        }

        .mobile-bracket-match .official-meta {
          display: none;
          gap: 0.3rem;
        }

        .mobile-bracket-match .bracket-node-body.expanded .official-meta {
          display: flex;
        }

        .mobile-bracket-match .official-meta span {
          padding: 0.24rem 0.36rem;
          font-size: 0.62rem;
        }

        .mobile-bracket-match .placeholder-bracket-score {
          gap: 0.4rem;
        }

        .mobile-bracket-match .placeholder-bracket-score strong {
          font-size: 0.82rem;
          line-height: 1.25;
        }

        .mobile-final-round {
          flex-basis: min(300px, calc(100vw - 2rem));
        }

        .mobile-final-round .center-final {
          min-height: 5.9rem;
          border-color: rgba(245, 158, 11, 0.5);
          box-shadow:
            0 0 0 1px rgba(245, 158, 11, 0.1),
            0 10px 22px rgba(2, 6, 23, 0.24);
        }

        .mobile-final-round .third-place-match {
          min-height: 5.35rem;
          opacity: 0.88;
        }

        .champion-round-mobile {
          flex-basis: min(300px, calc(100vw - 2rem));
        }

        .mobile-champion-card {
          width: 100%;
          box-sizing: border-box;
          min-height: 5.9rem;
          align-content: center;
          padding: 0.62rem;
          border-radius: 0.95rem;
        }

        .mobile-champion-card strong {
          font-size: 0.95rem;
          line-height: 1.15;
        }

        .mobile-champion-card small {
          font-size: 0.72rem;
          line-height: 1.3;
        }

        .mobile-bracket-detail-panel {
          display: grid;
          gap: 0.55rem;
          padding: 0.68rem;
          border: 1px solid rgba(20, 184, 166, 0.2);
          border-radius: 1rem;
          background: rgba(15, 23, 42, 0.56);
          box-shadow: 0 12px 26px rgba(2, 6, 23, 0.22);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }

        .mobile-detail-heading,
        .mobile-detail-score {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.55rem;
          min-width: 0;
        }

        .mobile-detail-heading span {
          padding: 0.22rem 0.42rem;
          border-radius: 999px;
          background: rgba(20, 184, 166, 0.12);
          color: #99f6e4;
          font-size: 0.62rem;
          font-weight: 950;
        }

        .mobile-detail-heading strong,
        .mobile-detail-score strong {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--ink);
          font-size: 0.86rem;
        }

        .mobile-detail-score span {
          flex: 0 0 auto;
          color: var(--ink);
          font-weight: 950;
        }

        .mobile-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.36rem;
        }

        .mobile-detail-grid div {
          min-width: 0;
          padding: 0.38rem 0.42rem;
          border: 1px solid rgba(148, 163, 184, 0.1);
          border-radius: 0.68rem;
          background: rgba(2, 6, 23, 0.24);
        }

        .mobile-detail-grid span,
        .mobile-detail-grid strong {
          display: block;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .mobile-detail-grid span {
          color: var(--muted);
          font-size: 0.54rem;
          font-weight: 950;
          text-transform: uppercase;
        }

        .mobile-detail-grid strong {
          margin-top: 0.1rem;
          color: var(--ink);
          font-size: 0.68rem;
          font-weight: 900;
        }

        .mobile-series-note {
          margin: 0;
          color: var(--muted);
          font-size: 0.72rem;
          font-weight: 850;
          line-height: 1.35;
        }

        .bracket-expanded-details {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.3rem;
          padding-top: 0.36rem;
        }

        .bracket-expanded-details div {
          padding: 0.32rem 0.36rem;
        }

        .bracket-expanded-details span {
          font-size: 0.52rem;
        }

        .bracket-expanded-details strong {
          font-size: 0.66rem;
        }

        .viewer-tabs {
          display: flex;
          gap: 0.38rem;
          overflow-x: auto;
          padding: 0.28rem;
          scroll-snap-type: x proximity;
          scrollbar-width: none;
        }

        .viewer-tabs::-webkit-scrollbar {
          display: none;
        }

        .viewer-tabs button,
        .viewer-tabs a {
          flex: 0 0 auto;
          min-width: max-content;
          min-height: 2.28rem;
          padding-inline: 0.88rem;
          font-size: 0.82rem;
          scroll-snap-align: start;
        }

        .league-switch button {
          padding-inline: 0.35rem;
          font-size: 0.82rem;
        }

        .public-match-toolbar {
          align-items: stretch;
          gap: 0.52rem;
          padding: 0.62rem;
        }

        .match-view-toggle {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          width: 100%;
        }

        .match-grid {
          gap: 0.42rem;
        }

        .match-row-card {
          padding: 0.52rem 0.58rem 0.52rem 0.72rem;
          border-radius: 0.86rem;
        }

        .match-row-main {
          grid-template-columns: 3.28rem minmax(0, 1fr) minmax(4.25rem, auto);
          grid-template-areas:
            "status home score"
            "status away court";
          gap: 0.24rem 0.5rem;
        }

        .match-row-status {
          grid-area: status;
        }

        .match-row-status strong {
          min-width: 2rem;
          padding: 0.12rem 0.3rem;
          font-size: 0.68rem;
        }

        .match-row-status span {
          font-size: 0.6rem;
        }

        .match-row-team.home {
          grid-area: home;
        }

        .match-row-team {
          font-size: 0.88rem;
        }

        .match-row-team.away {
          grid-area: away;
          text-align: left;
        }

        .match-row-score {
          grid-area: score;
          min-width: 4.25rem;
          font-size: 0.95rem;
        }

        .compact-court {
          grid-area: court;
          justify-self: end;
          max-width: 5.25rem;
          font-size: 0.64rem;
        }

        .match-expanded-details {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.32rem;
          margin-top: 0.44rem;
          padding-top: 0.44rem;
        }

        .match-expanded-details div {
          padding: 0.36rem 0.42rem;
        }

        .match-expanded-details span {
          font-size: 0.54rem;
        }

        .match-expanded-details strong {
          font-size: 0.7rem;
        }

        .section-title p:not(.kicker) {
          overflow-wrap: anywhere;
        }

        .summary-card h3 {
          white-space: normal;
        }

        .compact-scoreline {
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          gap: 0.35rem;
        }

        .compact-scoreline strong {
          font-size: 0.9rem;
        }

        .compact-scoreline span {
          min-width: 4rem;
          padding-inline: 0.42rem;
          font-size: 1.02rem;
        }

        .bracket-round:not(:last-child) {
          padding-bottom: 0.8rem;
          border-bottom: 1px solid rgba(20, 184, 166, 0.16);
        }

        .bracket-round:not(:last-child)::after {
          content: "↓";
          justify-self: center;
          color: var(--teal);
          font-weight: 950;
        }

        .bracket-arena {
          padding: 0.75rem;
        }

        .bracket-lane:not(:last-child),
        .bracket-center-lane {
          padding-bottom: 0.85rem;
          border-bottom: 1px solid rgba(20, 184, 166, 0.16);
        }
      }
    `,
  ],
})
export class TournamentViewerPageComponent implements OnDestroy {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private timer?: ReturnType<typeof setInterval>;
  private duplicateWarnings = new Set<string>();

  tournament?: Tournament;
  teams: Team[] = [];
  courts: Court[] = [];
  groups: Group[] = [];
  groupTeams: GroupTeam[] = [];
  matches: Match[] = [];
  standings: Standing[] = [];
  viewerError = '';
  activeTab: 'matches' | 'groups' | 'standings' | 'brackets' = 'matches';
  activeMatchView: 'all' | 'live' = 'all';
  expandedMatchId?: number;
  expandedBracketStage?: string;
  selectedMobileBracketStage?: string;
  selectedBracket: PublicBracketKey = 'champions';
  bracketMode: 'official' | 'seeding' = 'official';
  tournamentId = Number(this.route.snapshot.paramMap.get('id'));
  isBracketPage = this.route.snapshot.routeConfig?.path === 'viewer/tournament/:id/brackets';
  quarterfinalSlots = [
    { stage: 'quarter_final_1', label: 'QF1', title: '? vs ?', body: '? vs ?', format: 'Best of 1' },
    { stage: 'quarter_final_4', label: 'QF4', title: '? vs ?', body: '? vs ?', format: 'Best of 1' },
    { stage: 'quarter_final_2', label: 'QF2', title: '? vs ?', body: '? vs ?', format: 'Best of 1' },
    { stage: 'quarter_final_3', label: 'QF3', title: '? vs ?', body: '? vs ?', format: 'Best of 1' },
  ];
  semifinalSlots = [
    { stage: 'semi_final_1', label: 'SF1', title: 'Winner QF1 vs Winner QF4', body: 'Winner QF1 vs Winner QF4', format: 'Best of 1' },
    { stage: 'semi_final_2', label: 'SF2', title: 'Winner QF2 vs Winner QF3', body: 'Winner QF2 vs Winner QF3', format: 'Best of 1' },
  ];
  finalSlot = { stage: 'final', label: 'F', title: 'Winner SF1 vs Winner SF2', body: 'Winner SF1 vs Winner SF2', format: 'Best of 3' };
  thirdPlaceSlot = { stage: 'third_place', label: '3RD', title: 'Loser SF1 vs Loser SF2', body: 'Loser SF1 vs Loser SF2', format: 'Best of 1' };
  leftQuarterfinalSlots = [
    { stage: 'quarter_final_1', label: 'QF1', title: '? vs ?', body: '? vs ?', format: 'Best of 1' },
    { stage: 'quarter_final_4', label: 'QF4', title: '? vs ?', body: '? vs ?', format: 'Best of 1' },
  ];
  rightQuarterfinalSlots = [
    { stage: 'quarter_final_2', label: 'QF2', title: '? vs ?', body: '? vs ?', format: 'Best of 1' },
    { stage: 'quarter_final_3', label: 'QF3', title: '? vs ?', body: '? vs ?', format: 'Best of 1' },
  ];

  constructor() {
    const requestedTab = this.route.snapshot.queryParamMap.get('tab');
    if (requestedTab === 'groups' || requestedTab === 'standings' || requestedTab === 'brackets') {
      this.activeTab = requestedTab;
    }

    if (this.isBracketPage) {
      this.activeTab = 'brackets';
    }

    if (this.route.snapshot.queryParamMap.get('bracket') === 'premier') {
      this.selectedBracket = 'premier';
    }

    this.loadReferenceData();
    this.loadTournament();
    this.loadMatches();
    this.loadStandings();
    this.timer = setInterval(() => {
      this.loadMatches();
      this.loadStandings();
    }, 10000);
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  get liveMatches(): Match[] {
    return this.matches.filter((match) => match.status === 'Live');
  }

  get scheduledMatches(): Match[] {
    return this.matches.filter((match) => match.status === 'Scheduled');
  }

  get completedMatches(): Match[] {
    return this.matches.filter((match) => match.status === 'Completed');
  }

  get featuredLiveMatch(): Match | undefined {
    return this.liveMatches[0];
  }

  get nextScheduledMatch(): Match | undefined {
    return this.scheduledMatches[0];
  }

  get bracketSize(): number {
    return this.activeBracketProjection.rule.bracketSize;
  }

  get progression() {
    return buildProgressionProjection(this.standings, this.teams, this.groups, this.groupTeams);
  }

  get activeBracketProjection(): BracketProjection {
    return this.progression.brackets[this.selectedBracket];
  }

  get matchSections(): { title: string; matches: Match[] }[] {
    return [
      { title: 'Pool Matches', matches: this.matches.filter((match) => this.isPoolMatch(match)) },
      { title: 'Division A · Champions League', matches: this.matches.filter((match) => this.isChampionsMatch(match)) },
      { title: 'Division B · Premier League', matches: this.matches.filter((match) => this.isPremierMatch(match)) },
      { title: 'Independent / Other', matches: this.matches.filter((match) => this.isOtherMatch(match)) },
    ];
  }

  get publicMatchSections(): { title: string; matches: Match[] }[] {
    const source = this.activeMatchView === 'live' ? this.liveMatches : this.matches;
    return [
      { title: 'Pool Matches', matches: source.filter((match) => this.isPoolMatch(match)) },
      { title: 'Division A · Champions League', matches: source.filter((match) => this.isChampionsMatch(match)) },
      { title: 'Division B · Premier League', matches: source.filter((match) => this.isPremierMatch(match)) },
      { title: 'Independent / Other', matches: source.filter((match) => this.isOtherMatch(match)) },
    ];
  }

  get selectedMobileBracketSlot() {
    if (!this.selectedMobileBracketStage) {
      return undefined;
    }

    return [...this.quarterfinalSlots, ...this.semifinalSlots, this.finalSlot, this.thirdPlaceSlot].find(
      (slot) => slot.stage === this.selectedMobileBracketStage
    );
  }

  get officialKnockoutMatches(): Match[] {
    return this.matches.filter((match) =>
      this.selectedBracket === 'champions' ? this.isChampionsMatch(match) : this.isPremierMatch(match)
    );
  }

  get officialChampionName(): string {
    const final = this.getOfficialRoundMatches('final')[0];
    if (!final || final.status !== 'Completed' || !final.winner_team) {
      return 'Champion TBD';
    }

    return getTeamName(this.teams, final.winner_team);
  }

  getTeamsForGroup(groupId?: number): Team[] {
    if (!groupId) {
      return [];
    }

    const teamIds = new Set(
      this.groupTeams
        .filter((link) => link.group === groupId)
        .map((link) => link.team)
    );

    return this.teams.filter((team) => team.id && teamIds.has(team.id));
  }

  getStandingForTeam(teamId?: number): Standing | undefined {
    if (!teamId) {
      return undefined;
    }

    return this.standings.find((standing) => standing.team === teamId && !standing.pool_type);
  }

  getProjectionForTeam(teamId?: number): string {
    const projectionClass = this.getProjectionClass(teamId);
    if (projectionClass === 'champions') {
      return 'Division A · Champions League';
    }

    if (projectionClass === 'premier') {
      return 'Division B · Premier League';
    }

    if (projectionClass === 'eliminated') {
      return 'Eliminated';
    }

    return 'Pending';
  }

  getProjectionClass(teamId?: number): 'champions' | 'premier' | 'eliminated' | 'pending' {
    if (!teamId) {
      return 'pending';
    }

    const progression = this.progression;
    if (progression.brackets.champions.seeds.some((team) => team.teamId === teamId)) {
      return 'champions';
    }

    if (progression.brackets.premier.seeds.some((team) => team.teamId === teamId)) {
      return 'premier';
    }

    if (progression.eliminated.some((team) => team.teamId === teamId)) {
      return 'eliminated';
    }

    return 'pending';
  }

  loadReferenceData(): void {
    this.api.list<Team>('teams', { tournament: this.tournamentId, page_size: 100 }).subscribe((r) => (this.teams = r.results));
    this.api.list<Court>('courts').subscribe((r) => (this.courts = r.results));
    this.api.list<Group>('groups', { tournament: this.tournamentId, page_size: 100 }).subscribe((r) => (this.groups = r.results));
    this.api
      .list<GroupTeam>('group-teams', { group__tournament: this.tournamentId, page_size: 200 })
      .subscribe((r) => (this.groupTeams = r.results));
  }

  loadTournament(): void {
    this.viewerError = '';
    this.api.get<Tournament>('tournaments', this.tournamentId).subscribe({
      next: (tournament) => (this.tournament = tournament),
      error: () => {
        this.viewerError = `Tournament ${this.tournamentId} was not found. Rerun the seed command and open the latest demo tournament ID.`;
      },
    });
  }

  loadMatches(): void {
    this.api
      .list<Match>('matches', { tournament: this.tournamentId, ordering: 'scheduled_time', page_size: 250 })
      .subscribe((r) => {
        this.matches = r.results;
        this.warnDuplicateKnockoutMatches();
      });
  }

  loadStandings(): void {
    this.api
      .list<Standing>('standings', { tournament: this.tournamentId, ordering: 'rank', page_size: 100 })
      .subscribe((r) => (this.standings = r.results));
  }

  getTeamName(id?: number | null): string {
    return getTeamName(this.teams, id);
  }

  getCourtName(match: Match): string {
    return getCourtName(this.courts, match);
  }

  getGroupName(id?: number | null): string {
    return getGroupName(this.groups, id);
  }

  getMatchStageLabel(match: Match): string {
    return getMatchStageLabel(match, this.groups);
  }

  getMatchFormatLabel(match: Match): string {
    return getMatchFormatLabel(match);
  }

  formatMatchTime(value?: string | null): string {
    return formatMatchTime(value);
  }

  setMatchView(view: 'all' | 'live'): void {
    this.activeMatchView = view;
    this.expandedMatchId = undefined;
  }

  toggleMatch(match: Match): void {
    this.expandedMatchId = this.expandedMatchId === match.id ? undefined : match.id;
  }

  toggleBracketStage(stage: string): void {
    this.expandedBracketStage = this.expandedBracketStage === stage ? undefined : stage;
  }

  selectMobileBracketStage(stage: string): void {
    this.selectedMobileBracketStage = this.selectedMobileBracketStage === stage ? undefined : stage;
  }

  isBracketWinner(match: Match, side: 'a' | 'b'): boolean {
    if (match.status !== 'Completed' || !match.team_a || !match.team_b || match.score_a === match.score_b) {
      return false;
    }

    const winner = match.winner_team || (match.score_a > match.score_b ? match.team_a : match.team_b);
    return side === 'a' ? winner === match.team_a : winner === match.team_b;
  }

  isBracketLoser(match: Match, side: 'a' | 'b'): boolean {
    if (match.status !== 'Completed' || !match.team_a || !match.team_b || match.score_a === match.score_b) {
      return false;
    }

    return !this.isBracketWinner(match, side);
  }

  getSeriesSummary(match: Match): string {
    return (match.best_of || 1) > 1
      ? `${match.score_a} - ${match.score_b} series score. Set breakdown will appear when set scoring is available.`
      : `${match.score_a} - ${match.score_b}`;
  }

  getCompactStatusPrimary(match: Match): string {
    if (match.status === 'Live') {
      return 'LIVE';
    }

    if (match.status === 'Completed') {
      return 'FT';
    }

    return formatMatchTime(match.scheduled_time);
  }

  getCompactStatusSecondary(match: Match): string {
    if (match.status === 'Scheduled') {
      return 'Scheduled';
    }

    return formatMatchTime(match.scheduled_time);
  }

  getCompactScoreLabel(match: Match): string {
    if (match.status === 'Scheduled') {
      return formatMatchTime(match.scheduled_time);
    }

    return `${match.score_a} - ${match.score_b}`;
  }

  getMatchTypeLabel(match: Match): string {
    return match.match_type === 'knockout' ? 'Knockout' : 'Pool / group stage';
  }

  getOfficialRoundMatches(stage: string): Match[] {
    return this.officialKnockoutMatches
      .filter((match) => {
        const normalizedStage = normalizeStage(match.stage);
        return normalizedStage === stage || normalizedStage.startsWith(`${stage}_`);
      })
      .sort((a, b) => normalizeStage(a.stage).localeCompare(normalizeStage(b.stage)));
  }

  getOfficialMatch(stage: string): Match | undefined {
    const normalizedStage = normalizeStage(stage);
    const storedMatch = this.resolveStoredOfficialMatch(normalizedStage);

    if (normalizedStage === 'semi_final_1') {
      return this.hydrateMatchSlots(storedMatch, this.getAdvancingTeamId('quarter_final_1', 'winner'), this.getAdvancingTeamId('quarter_final_4', 'winner'));
    }

    if (normalizedStage === 'semi_final_2') {
      return this.hydrateMatchSlots(storedMatch, this.getAdvancingTeamId('quarter_final_2', 'winner'), this.getAdvancingTeamId('quarter_final_3', 'winner'));
    }

    if (normalizedStage === 'final') {
      return this.hydrateMatchSlots(storedMatch, this.getAdvancingTeamId('semi_final_1', 'winner'), this.getAdvancingTeamId('semi_final_2', 'winner'));
    }

    if (normalizedStage === 'third_place') {
      return this.hydrateMatchSlots(storedMatch, this.getAdvancingTeamId('semi_final_1', 'loser'), this.getAdvancingTeamId('semi_final_2', 'loser'));
    }

    return storedMatch;
  }

  getStandingTeamName(standing: Standing): string {
    return standing.team_name || getTeamName(this.teams, standing.team);
  }

  getPointDifferential(standing: Standing): number {
    return standing.points_scored - standing.points_given;
  }

  getSignedPointDifferential(standing: Standing): string {
    const differential = this.getPointDifferential(standing);
    return differential > 0 ? `+${differential}` : String(differential);
  }

  getStandingTiebreakNote(standing: Standing, index: number): string {
    const next = this.standings[index + 1];
    if (this.hasSameWinTotal(standing, next)) {
      return `Ahead on ${this.getTiebreakReason(standing, next)}`;
    }

    const previous = this.standings[index - 1];
    if (this.hasSameWinTotal(previous, standing)) {
      return `Separated by ${this.getTiebreakReason(previous, standing)}`;
    }

    return '';
  }

  getPoolLabel(standing: Standing): string {
    if (!standing.pool_type) {
      return '';
    }

    return `${standing.pool_type.charAt(0).toUpperCase()}${standing.pool_type.slice(1)} pool`;
  }

  private hasSameWinTotal(a?: Standing, b?: Standing): boolean {
    return Boolean(a && b && a.wins === b.wins);
  }

  private getTiebreakReason(a: Standing, b: Standing): string {
    if (this.getPointDifferential(a) !== this.getPointDifferential(b)) {
      return 'point differential';
    }

    if (a.points_scored !== b.points_scored) {
      return 'points scored';
    }

    const headToHeadWinner = this.getHeadToHeadWinnerId(a.team, b.team);
    if (headToHeadWinner) {
      return 'head-to-head';
    }

    return 'stored rank';
  }

  private getHeadToHeadWinnerId(teamAId: number, teamBId: number): number | null {
    const directMatch = this.matches.find(
      (match) =>
        match.match_type === 'league' &&
        match.status === 'Completed' &&
        ((match.team_a === teamAId && match.team_b === teamBId) ||
          (match.team_a === teamBId && match.team_b === teamAId)),
    );

    if (!directMatch) {
      return null;
    }

    return directMatch.winner_team || (directMatch.score_a > directMatch.score_b ? directMatch.team_a || null : directMatch.team_b || null);
  }

  private isPoolMatch(match: Match): boolean {
    return match.match_type === 'league' && Boolean(match.group);
  }

  private isChampionsMatch(match: Match): boolean {
    return match.match_type === 'knockout' && match.pool_type === 'premium';
  }

  private isPremierMatch(match: Match): boolean {
    return match.match_type === 'knockout' && match.pool_type === 'star';
  }

  private isOtherMatch(match: Match): boolean {
    return !this.isPoolMatch(match) && !this.isChampionsMatch(match) && !this.isPremierMatch(match);
  }

  private resolveStoredOfficialMatch(stage: string): Match | undefined {
    const exactMatch = this.pickBestOfficialMatch(
      this.officialKnockoutMatches.filter((match) => normalizeStage(match.stage) === stage)
    );

    if (stage.startsWith('quarter_final') && exactMatch?.team_a && exactMatch.team_b) {
      const legacyMatch = this.pickBestOfficialMatch(
        this.officialKnockoutMatches.filter(
          (match) =>
            normalizeStage(match.stage) === 'quarter_final' &&
            match.team_a === exactMatch.team_a &&
            match.team_b === exactMatch.team_b
        )
      );

      if (legacyMatch && this.isBetterDisplayMatch(legacyMatch, exactMatch)) {
        console.warn(`Using completed legacy ${stage} match ${legacyMatch.id} instead of stale keyed match ${exactMatch.id}.`);
        return legacyMatch;
      }
    }

    return exactMatch;
  }

  private pickBestOfficialMatch(matches: Match[]): Match | undefined {
    return [...matches].sort((a, b) => this.displayMatchRank(b) - this.displayMatchRank(a))[0];
  }

  private displayMatchRank(match: Match): number {
    const statusRank = match.status === 'Completed' ? 1_000_000 : match.status === 'Live' ? 500_000 : 0;
    const scoreRank = match.score_a || match.score_b ? 100_000 : 0;
    const teamRank = match.team_a && match.team_b ? 10_000 : 0;
    return statusRank + scoreRank + teamRank + (match.id || 0);
  }

  private isBetterDisplayMatch(candidate: Match, current: Match): boolean {
    if (candidate.status === 'Completed' && current.status !== 'Completed') {
      return true;
    }

    if ((candidate.score_a || candidate.score_b) && !(current.score_a || current.score_b)) {
      return true;
    }

    return false;
  }

  private hydrateMatchSlots(match: Match | undefined, teamA?: number, teamB?: number): Match | undefined {
    if (!match) {
      return undefined;
    }

    return {
      ...match,
      team_a: match.team_a || teamA || null,
      team_b: match.team_b || teamB || null,
    };
  }

  private getAdvancingTeamId(stage: string, result: 'winner' | 'loser'): number | undefined {
    const match = this.resolveStoredOfficialMatch(stage);
    if (!match || match.status !== 'Completed' || !match.team_a || !match.team_b || match.score_a === match.score_b) {
      return undefined;
    }

    const winner = match.winner_team || (match.score_a > match.score_b ? match.team_a : match.team_b);
    const loser = winner === match.team_a ? match.team_b : match.team_a;
    return result === 'winner' ? winner : loser;
  }

  private warnDuplicateKnockoutMatches(): void {
    const seen = new Map<string, Match[]>();
    this.matches
      .filter((match) => match.match_type === 'knockout')
      .forEach((match) => {
        const key = `${match.pool_type}:${normalizeStage(match.stage)}:${match.team_a || 'tbd'}:${match.team_b || 'tbd'}`;
        seen.set(key, [...(seen.get(key) || []), match]);
      });

    seen.forEach((matches, key) => {
      if (matches.length > 1 && !this.duplicateWarnings.has(key)) {
        this.duplicateWarnings.add(key);
        console.warn('Duplicate official knockout matches detected:', matches);
      }
    });
  }
}
