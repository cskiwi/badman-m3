import { MigrationInterface, QueryRunner } from 'typeorm';

export class EventCompetitionStateCountry1773490144882 implements MigrationInterface {
  name = 'EventCompetitionStateCountry1773490144882';

  // ILIKE pattern → [state, country]
  // Patterns are designed to be mutually exclusive across all seasons.
  // state is NULL for national / league-wide competitions.
  private readonly mappings: [string, string | null][] = [
    ['%LFBB Interclubs%', null],
    ['%Vlaamse interclubcompetitie%', null],
    ['%Victor League%', null],
    ['%Limburgse interclubcompetitie%', 'BE-VLI'],
    ['%PBO%', 'BE-VOV'],
    ['%PBA%', 'BE-VAN'],
    ['%VVBBC%', 'BE-VBR'],
    ['%WVBF%', 'BE-VWV'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // A single UPDATE joins against a VALUES list of ILIKE patterns.
    // All competitions (across all seasons) whose name matches a pattern
    // receive the canonical state and lowercase country code.
    const rows = this.mappings.map(([pattern, state]) => `(${this.q(pattern)}, ${this.q(state)}, 'be')`).join(',\n        ');

    await queryRunner.query(`
      UPDATE event."EventCompetitions" AS ec
      SET
        "state"     = m.state,
        "country"   = m.country
      FROM (VALUES
        ${rows}
      ) AS m(pattern, state, country)
      WHERE ec."name" ILIKE m.pattern
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The pre-migration data was inconsistent across seasons (mixed NULL, '0',
    // 'BEL', 'be' values). A full per-row restore is not feasible with a
    // pattern-based approach, so this revert clears all matched rows back to
    // NULL / NULL, which was the most common original state.
    const patterns = this.mappings.map(([pattern]) => `${this.q(pattern)}`).join(', ');

    await queryRunner.query(`
      UPDATE event."EventCompetitions"
      SET
        "state"     = NULL,
        "country"   = NULL,
        "updatedAt" = NOW()
      WHERE "name" ILIKE ANY(ARRAY[${patterns}])
    `);
  }

  private q(value: string | null): string {
    if (value === null) return 'NULL';
    return `'${value.replace(/'/g, "''")}'`;
  }
}
