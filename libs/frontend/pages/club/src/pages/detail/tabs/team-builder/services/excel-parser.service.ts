import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { SurveyResponse } from '../types/survey-response';

const COLUMN_MAP: Record<
  keyof Omit<
    SurveyResponse,
    'matchedPlayerId' | 'matchedPlayerName' | 'matchConfidence' | 'firstName' | 'lastName' | 'fullName' | 'stoppingCompetition'
  >,
  string[]
> = {
  externalId: ['id'],
  createdOn: ['created on'],
  createdBy: ['created by'],
  currentTeams: ['in welke ploeg(en) speel je momenteel'],
  desiredTeamCount: ['in hoeveel ploegen zou je willen spelen'],
  preferredPlayDay: ['voorkeurs speeldag thuiswedstrijden'],
  team1Choice1: ['1e ploeg: 1e keuze'],
  team1Choice2: ['1e ploeg: 2e keuze'],
  team2Choice1: ['2e ploeg: 1e keuze'],
  team2Choice2: ['2e ploeg: 2e keuze'],
  comments: ['zijn er eventuele andere opmerkingen'],
  canMeet75PercentTeam1: ['kan je deze 75% halen voor je 1e ploeg'],
  unavailabilityPeriodsTeam1: ['welke periode/momenten kan je niet spelen in je 1e ploeg'],
  canMeet75PercentTeam2: ['kan je deze 75% halen voor je 2e ploeg'],
  unavailabilityPeriodsTeam2: ['welke periode/momenten kan je niet spelen in je 2e ploeg'],
  meetingAttendance: ['aanwezigheid competitie vergadering'],
  availableDates: ['ik ben beschikbaar op volgende data'],
  linkedContactIds: ['linked contact ids'],
};

@Injectable()
export class ExcelParserService {
  async parseFile(file: File): Promise<SurveyResponse[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    if (rawRows.length === 0) return [];

    const headers = Object.keys(rawRows[0]);
    const headerMap = this.buildHeaderMap(headers);
    const nameColumns = this.detectNameColumns(headers);

    return rawRows.map((row) => this.mapRow(row, headerMap, nameColumns));
  }

  /**
   * Detect the "Full Name" column and its adjacent headerless column.
   * The Excel has header D="Full Name" with first name values,
   * and column E with no header (SheetJS names it __EMPTY*) containing last names.
   */
  private detectNameColumns(headers: string[]): { firstNameHeader: string; lastNameHeader: string | null } {
    const fullNameIdx = headers.findIndex((h) => h.trim().toLowerCase() === 'full name');

    if (fullNameIdx < 0) {
      return { firstNameHeader: '', lastNameHeader: null };
    }

    const firstNameHeader = headers[fullNameIdx];
    const nextHeader = headers[fullNameIdx + 1];

    // The next column is the last name if it has no real header (SheetJS uses __EMPTY*)
    const lastNameHeader = nextHeader?.startsWith('__EMPTY') ? nextHeader : null;

    return { firstNameHeader, lastNameHeader };
  }

  private buildHeaderMap(headers: string[]): Map<string, string> {
    const map = new Map<string, string>();

    for (const header of headers) {
      const normalized = header.trim().toLowerCase();

      for (const [field, patterns] of Object.entries(COLUMN_MAP)) {
        if (map.has(field)) continue;
        if (patterns.some((pattern) => normalized.startsWith(pattern))) {
          map.set(field, header);
          break;
        }
      }
    }

    return map;
  }

  private mapRow(
    row: Record<string, unknown>,
    headerMap: Map<string, string>,
    nameColumns: { firstNameHeader: string; lastNameHeader: string | null },
  ): SurveyResponse {
    const get = (field: string): string => {
      const header = headerMap.get(field);
      if (!header) return '';
      const val = row[header];
      return val != null ? String(val).trim() : '';
    };

    const getRaw = (header: string): string => {
      const val = row[header];
      return val != null ? String(val).trim() : '';
    };

    const splitList = (value: string): string[] => {
      if (!value) return [];
      return value
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);
    };

    // "Full Name" column contains first name, next headerless column contains last name
    const firstName = nameColumns.firstNameHeader ? getRaw(nameColumns.firstNameHeader) : '';
    const lastName = nameColumns.lastNameHeader ? getRaw(nameColumns.lastNameHeader) : '';
    const fullName = `${firstName} ${lastName}`.trim();

    const desiredTeamCountRaw = get('desiredTeamCount');
    const stoppingCompetition = desiredTeamCountRaw.toLowerCase().includes('ik stop met competitie');

    return {
      externalId: get('externalId'),
      createdOn: get('createdOn'),
      createdBy: get('createdBy'),
      fullName,
      firstName,
      lastName,
      currentTeams: splitList(get('currentTeams')),
      desiredTeamCount: stoppingCompetition ? 0 : parseInt(desiredTeamCountRaw, 10) || 1,
      preferredPlayDay: get('preferredPlayDay'),
      team1Choice1: get('team1Choice1'),
      team1Choice2: get('team1Choice2'),
      team2Choice1: get('team2Choice1'),
      team2Choice2: get('team2Choice2'),
      comments: get('comments'),
      canMeet75PercentTeam1: get('canMeet75PercentTeam1'),
      unavailabilityPeriodsTeam1: get('unavailabilityPeriodsTeam1'),
      canMeet75PercentTeam2: get('canMeet75PercentTeam2'),
      unavailabilityPeriodsTeam2: get('unavailabilityPeriodsTeam2'),
      stoppingCompetition,
      meetingAttendance: get('meetingAttendance'),
      availableDates: splitList(get('availableDates')),
      linkedContactIds: splitList(get('linkedContactIds')),
    };
  }
}
