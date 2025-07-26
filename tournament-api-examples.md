# Tournament Software API - Complete Data Structure Examples

## Overview

This document contains complete data structure examples from the Tournament Software API based on two real tournaments:

1. **PBO Competitie 2025-2026** (Competition - TypeID: 1)
   - Database ID: `c71d9875-413d-472c-80d6-a39378a2bfab`
   - Visual Code: `C3B7B9D5-902B-40B8-939B-30A14C01F5AC`

2. **Lokerse Volvo International 2025** (Tournament - TypeID: 0)
   - Database ID: `d1d30c5b-94c9-4a02-b45d-568131a909c5`
   - Visual Code: `3BAC39DE-2E82-4655-8269-4D83777598BA`

## Competition Structure (TypeID: 1) - PBO Competitie 2025-2026

### Tournament Details
```xml
<Result Version="1.0">
  <Tournament>
    <Code>C3B7B9D5-902B-40B8-939B-30A14C01F5AC</Code>
    <Name>PBO Competitie 2025-2026</Name>
    <TypeID>1</TypeID> <!-- Team Tournament -->
    <TournamentStatus>0</TournamentStatus> <!-- Unknown/Active -->
    <LastUpdated>2025-07-14T00:31:35.06</LastUpdated>
    <StartDate>2025-09-01T00:00:00</StartDate>
    <EndDate>2026-04-30T23:59:59</EndDate>
    <Livescore>false</Livescore>
    <TournamentTimezone>105</TournamentTimezone> <!-- Brussels/Paris timezone -->
    <Organization>
      <ID>3825E3C5-1371-4FF6-94AF-C4A3B152802A</ID>
      <Name>PBO vzw</Name>
    </Organization>
    <Contact>
      <Name>Toon Bouchier</Name>
      <Phone>0478 33 22 95</Phone>
      <Email>competitie@badminton-pbo.be</Email>
    </Contact>
    <Venue>
      <City>Sint-Pauwels</City>
      <CountryCode>BEL</CountryCode>
    </Venue>
  </Tournament>
</Result>
```

### Competition Events Structure
```xml
<Result Version="1.0">
  <TournamentEvent>
    <Code>12</Code>
    <Name>1e Provinciale</Name>
    <GenderID>1</GenderID> <!-- Men -->
    <GameTypeID>2</GameTypeID> <!-- Doubles -->
    <ParaClassID>0</ParaClassID>
  </TournamentEvent>
  <TournamentEvent>
    <Code>13</Code>
    <Name>2e Provinciale</Name>
    <GenderID>1</GenderID> <!-- Men -->
    <GameTypeID>2</GameTypeID> <!-- Doubles -->
    <ParaClassID>0</ParaClassID>
  </TournamentEvent>
  <!-- Events continue for Women (GenderID=2) and Mixed (GenderID=3) -->
</Result>
```

### Competition Teams Structure
```xml
<Result Version="1.0">
  <Team>
    <Code>158</Code>
    <Name>Beveren 1H (41)</Name> <!-- H = Heren (Men), number in parentheses is strength -->
    <CountryCode>BEL</CountryCode>
  </Team>
  <Team>
    <Code>162</Code>
    <Name>De Mintons 3H (38)</Name>
    <CountryCode>BEL</CountryCode>
  </Team>
  <!-- More teams... -->
</Result>
```

### Competition Draw Structure (Round Robin/Poule)
```xml
<Result Version="1.0">
  <TournamentDraw>
    <Code>12</Code>
    <EventCode>3</EventCode>
    <Name>3e Provinciale - A</Name>
    <TypeID>3</TypeID> <!-- Round Robin -->
    <Size>8</Size>
    <Qualification>false</Qualification>
    <StageCode>7</StageCode>
    <Position>1</Position>
    <Structure>
      <Item>
        <Col>0</Col>
        <Row>1</Row>
        <Code>591</Code> <!-- Match Code -->
        <Winner>0</Winner> <!-- 0=Not played, 1=Team1 wins, 2=Team2 wins -->
        <ScoreStatus>0</ScoreStatus>
        <Team>
          <Code>21</Code>
          <Name>Lokerse 4D (66)</Name>
          <CountryCode>BEL</CountryCode>
        </Team>
      </Item>
      <Item>
        <Col>2</Col>
        <Row>1</Row>
        <Code>606</Code>
        <Winner>0</Winner>
        <ScoreStatus>0</ScoreStatus>
        <MatchTime>2025-09-21T17:30:00</MatchTime>
        <Team />
      </Item>
      <!-- Matrix structure continues... -->
    </Structure>
  </TournamentDraw>
</Result>
```

## Tournament Structure (TypeID: 0) - Lokerse Volvo International 2025

### Tournament Details
```xml
<Result Version="1.0">
  <Tournament>
    <Code>3BAC39DE-2E82-4655-8269-4D83777598BA</Code>
    <Name>Lokerse Volvo International 2025</Name>
    <Number>BV_2024-2025_W17_2</Number>
    <TypeID>0</TypeID> <!-- Individual Tournament -->
    <TournamentStatus>101</TournamentStatus> <!-- Tournament Finished -->
    <LastUpdated>2025-04-28T09:04:27</LastUpdated>
    <StartDate>2025-04-26T00:00:00</StartDate>
    <EndDate>2025-04-27T00:00:00</EndDate>
    <Livescore>false</Livescore>
    <OnlineEntryStartDate>2025-03-14T23:59:00</OnlineEntryStartDate>
    <OnlineEntryEndDate>2025-04-11T23:59:00</OnlineEntryEndDate>
    <TournamentTimezone>105</TournamentTimezone>
    <OnlineEntryWithdrawalDeadline>2025-04-11T21:59:00</OnlineEntryWithdrawalDeadline>
    <Organization>
      <ID>BD67578C-8A82-494E-9984-C798FB588FEB</ID>
      <Name>Lokerse BC</Name>
    </Organization>
    <Contact>
      <Name>Jordy Van der Sypt</Name>
      <Phone>+324 89 38 11 77</Phone>
      <Email>tornooilokersebc@gmail.com</Email>
    </Contact>
    <Venue>
      <Name>Sport en Jeugdcomplex Lokeren</Name>
      <Address>Sportlaan 2</Address>
      <PostalCode>9160</PostalCode>
      <City>Lokeren</City>
      <State>Oost-Vlaanderen</State>
      <CountryCode>BEL</CountryCode>
      <Phone>09 235 31 13</Phone>
    </Venue>
  </Tournament>
</Result>
```

### Tournament Events Structure
```xml
<Result Version="1.0">
  <TournamentEvent>
    <Code>9</Code>
    <Name>MS 1-2</Name> <!-- Men's Singles Level 1-2 -->
    <LevelID>1</LevelID>
    <GenderID>1</GenderID> <!-- Men -->
    <GameTypeID>1</GameTypeID> <!-- Singles -->
    <ParaClassID>0</ParaClassID>
  </TournamentEvent>
  <TournamentEvent>
    <Code>10</Code>
    <Name>WS 1-2</Name> <!-- Women's Singles Level 1-2 -->
    <LevelID>1</LevelID>
    <GenderID>2</GenderID> <!-- Women -->
    <GameTypeID>1</GameTypeID> <!-- Singles -->
    <ParaClassID>0</ParaClassID>
  </TournamentEvent>
  <TournamentEvent>
    <Code>11</Code>
    <Name>MD 1-2</Name> <!-- Men's Doubles Level 1-2 -->
    <LevelID>1</LevelID>
    <GenderID>1</GenderID> <!-- Men -->
    <GameTypeID>2</GameTypeID> <!-- Doubles -->
    <ParaClassID>0</ParaClassID>
  </TournamentEvent>
  <!-- More events with different levels and disciplines... -->
</Result>
```

### Tournament Entry Structure
```xml
<Result Version="1.0">
  <Entry>
    <StageEntries>
      <StageEntry>
        <StageCode>30</StageCode>
        <Seed>1</Seed> <!-- Optional seeding -->
      </StageEntry>
    </StageEntries>
    <Player1>
      <MemberID>50082004</MemberID>
      <Firstname>Sander</Firstname>
      <Lastname>Prenen</Lastname>
      <GenderID>1</GenderID>
      <CountryCode>BEL</CountryCode>
    </Player1>
    <!-- Player2 would be present for doubles events -->
  </Entry>
  <!-- More entries... -->
</Result>
```

### Tournament Draw Structure (Knockout)
```xml
<Result Version="1.0">
  <TournamentDraw>
    <Code>30</Code>
    <EventCode>20</EventCode>
    <Name>WS 5-6-7</Name>
    <TypeID>0</TypeID> <!-- Knockout/Elimination -->
    <Size>8</Size>
    <Qualification>false</Qualification>
    <StageCode>63</StageCode>
    <Position>1</Position>
    <Structure>
      <Item>
        <Col>1</Col> <!-- Round 1 -->
        <Row>1</Row> <!-- Position in round -->
        <Code>523</Code> <!-- Match Code -->
        <Winner>1</Winner> <!-- Team1 won -->
        <ScoreStatus>0</ScoreStatus>
        <MatchTime>2025-04-27T15:55:00</MatchTime>
        <Team>
          <Player1>
            <MemberID>51235781</MemberID>
            <Firstname>Mira</Firstname>
            <Lastname>Devos</Lastname>
            <GenderID>2</GenderID>
            <CountryCode>BEL</CountryCode>
          </Player1>
        </Team>
        <Sets>
          <Set Team1="21" Team2="13" />
          <Set Team1="21" Team2="9" />
        </Sets>
      </Item>
      <!-- More draw items... -->
    </Structure>
  </TournamentDraw>
</Result>
```

### Detailed Match Information
```xml
<Result Version="1.0">
  <Match>
    <Code>523</Code>
    <Winner>1</Winner>
    <ScoreStatus>0</ScoreStatus>
    <RoundName>Final</RoundName>
    <MatchTime>2025-04-27T15:55:00</MatchTime>
    <EventCode>20</EventCode>
    <EventName>WS 5-6-7</EventName>
    <DrawCode>30</DrawCode>
    <DrawName>WS 5-6-7</DrawName>
    <CourtCode>8</CourtCode>
    <CourtName>8</CourtName>
    <LocationCode>1</LocationCode>
    <LocationName>Hoofdlocatie</LocationName>
    <Team1>
      <Player1>
        <MemberID>51235781</MemberID>
        <Firstname>Mira</Firstname>
        <Lastname>Devos</Lastname>
        <GenderID>2</GenderID>
        <CountryCode>BEL</CountryCode>
      </Player1>
    </Team1>
    <Team2>
      <Player1>
        <MemberID>50592416</MemberID>
        <Firstname>Jelena</Firstname>
        <Lastname>Wybaillie</Lastname>
        <GenderID>2</GenderID>
        <CountryCode>BEL</CountryCode>
      </Player1>
    </Team2>
    <Duration>27</Duration> <!-- Match duration in minutes -->
    <Sets>
      <Set Team1="21" Team2="13" />
      <Set Team1="21" Team2="9" />
    </Sets>
  </Match>
</Result>
```

## Data Model Mapping for Sync Implementation

### Key Identifiers
- **Tournament Code**: GUID used as primary identifier in Tournament Software
- **Visual Code**: Same as Tournament Code, used in our database
- **Event Code**: Numeric identifier for events within a tournament
- **Team Code**: Numeric identifier for teams
- **Match Code**: Numeric identifier for matches
- **Member ID**: Unique player identifier across the system

### Tournament Types and Their Characteristics

#### TypeID: 1 (Team Competitions)
- **Structure**: Round-robin poules with team-based matches
- **Team Names**: Include suffix indicating gender and strength (e.g., "Beveren 1H (41)")
- **Scheduling**: Season-long (September - April)
- **Draw Type**: TypeID 3 (Round Robin)
- **Match Structure**: Team encounters with multiple individual games

#### TypeID: 0 (Individual Tournaments)
- **Structure**: Knockout/elimination draws with individual players
- **Player Names**: Individual entries with Member IDs
- **Scheduling**: Weekend tournaments (1-2 days)
- **Draw Type**: TypeID 0 (Knockout)
- **Match Structure**: Direct individual matches

### Gender and Game Type Codes
- **GenderID**: 1=Men, 2=Women, 3=Mixed
- **GameTypeID**: 1=Singles, 2=Doubles
- **ParaClassID**: 0=Standard (non-para classification)

### Match Status Codes
- **Winner**: 0=Not played, 1=Team1/Player1 wins, 2=Team2/Player2 wins
- **ScoreStatus**: 0=Normal completion, other values for special statuses

### Team Naming Convention for Competitions
Format: `[Club Name] [Team Number][Gender] ([Strength])`
- **Club Name**: Official club name
- **Team Number**: 1, 2, 3, etc.
- **Gender**: H=Heren (Men), D=Dames (Women), G=Gemengd (Mixed)
- **Strength**: Numeric value indicating team strength/level

This comprehensive data structure provides the foundation for implementing the tournament sync worker with full understanding of both competition and tournament formats.