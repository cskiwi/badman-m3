import { AllowAnonymous, PermGuard, User } from '@app/backend-authorization';
import { Club, ClubPlayerMembership, Player, Team, TeamPlayerMembership } from '@app/models';
import { ClubMembershipType, TeamMembershipType } from '@app/models-enum';
import { Days } from '@app/models-enum';
import { IsUUID } from '@app/utils';
import { BadRequestException, NotFoundException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ClubArgs, TeamArgs, TeamPlayerMembershipArgs } from '../args';
import { TeamUpdateInput } from '../inputs';
import { CreatePlayerForTeamBuilderInput, TeamBuilderTeamInput } from '../inputs/team-builder.input';

@Resolver(() => Team)
export class TeamResolver {
  @Query(() => Team)
  @AllowAnonymous()
  async team(@Args('id', { type: () => ID }) id: string): Promise<Team> {
    const team = IsUUID(id)
      ? await Team.findOne({
          where: {
            id,
          },
        })
      : await Team.findOne({
          where: {
            slug: id,
          },
        });

    if (team) {
      return team;
    }

    throw new NotFoundException(id);
  }

  @Query(() => [Team])
  @AllowAnonymous()
  async teams(
    @Args('args', { type: () => TeamArgs, nullable: true })
    inputArgs?: InstanceType<typeof TeamArgs>,
  ): Promise<Team[]> {
    const args = TeamArgs.toFindOneOptions(inputArgs);
    return Team.find(args);
  }

  @ResolveField(() => [TeamPlayerMembership], { nullable: true })
  async teamPlayerMemberships(
    @Parent() { id }: Team,
    @Args('args', {
      type: () => TeamPlayerMembershipArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof TeamPlayerMembershipArgs>,
  ) {
    const args = TeamPlayerMembershipArgs.toFindManyOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        teamId: id,
      }));
    } else {
      args.where = [
        {
          teamId: id,
        },
      ];
    }

    return TeamPlayerMembership.find(args);
  }

  @ResolveField(() => Club, { nullable: true })
  async club(
    @Parent() { clubId }: Team,
    @Args('args', {
      type: () => ClubArgs,
      nullable: true,
    })
    inputArgs?: InstanceType<typeof ClubArgs>,
  ) {
    if (!clubId) return null;

    const args = ClubArgs.toFindOneOptions(inputArgs);

    if (args.where?.length > 0) {
      args.where = args.where.map((where) => ({
        ...where,
        id: clubId,
      }));
    } else {
      args.where = [
        {
          id: clubId,
        },
      ];
    }

    return Club.findOne(args);
  }

  @ResolveField(() => Player, { nullable: true })
  async captain(@Parent() { captainId }: Team) {
    return Player.findOne({
      where: {
        id: captainId,
      },
    });
  }

  @Mutation(() => Team)
  @UseGuards(PermGuard)
  async updateTeam(@User() user: Player, @Args('teamId', { type: () => ID }) teamId: string, @Args('input') input: TeamUpdateInput): Promise<Team> {
    // Find the team
    const team = await Team.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    // Define basic info fields that require edit-any:team claim
    const basicInfoFields = ['name', 'abbreviation', 'type', 'season', 'teamNumber'];

    // Check if any basic info fields are being updated
    const updatingBasicInfo = Object.keys(input).some(
      (field) => basicInfoFields.includes(field) && input[field as keyof TeamUpdateInput] !== undefined,
    );

    if (updatingBasicInfo) {
      const canEditBasicInfo = user.hasAnyPermission(['edit-any:team', 'edit-any:club']);
      if (!canEditBasicInfo) {
        throw new UnauthorizedException('You do not have permission to edit basic team information');
      }
    }

    // For other fields, check if user can edit this specific team or has global edit permissions
    const canEditTeam = user.hasAnyPermission(['edit-any:team', 'edit-any:club', `${teamId}_edit:team`]);
    if (!canEditTeam) {
      throw new UnauthorizedException('You do not have permission to edit this team');
    }

    // Validate captain if provided
    if (input.captainId) {
      const captain = await Player.findOne({ where: { id: input.captainId } });
      if (!captain) {
        throw new NotFoundException(`Player with ID ${input.captainId} not found`);
      }
    }

    // Update team fields
    if (input.name !== undefined) team.name = input.name;
    if (input.abbreviation !== undefined) team.abbreviation = input.abbreviation;
    if (input.email !== undefined) team.email = input.email;
    if (input.phone !== undefined) team.phone = input.phone;
    if (input.captainId !== undefined) team.captainId = input.captainId;
    if (input.preferredTime !== undefined) team.preferredTime = input.preferredTime;
    if (input.preferredDay !== undefined) team.preferredDay = input.preferredDay;
    if (input.type !== undefined) team.type = input.type;
    if (input.season !== undefined) team.season = input.season;
    if (input.teamNumber !== undefined) team.teamNumber = input.teamNumber;

    await team.save();
    return team;
  }

  @Mutation(() => TeamPlayerMembership)
  @UseGuards(PermGuard)
  async updateTeamPlayerMembership(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string,
    @Args('membershipType') membershipType: string,
  ): Promise<TeamPlayerMembership> {
    // Validate membership type
    const validMembershipTypes = Object.values(TeamMembershipType);
    if (!validMembershipTypes.includes(membershipType as TeamMembershipType)) {
      throw new BadRequestException(`Invalid membership type. Must be one of: ${validMembershipTypes.join(', ')}`);
    }

    // Find the team player membership
    const membership = await TeamPlayerMembership.findOne({
      where: { id },
      relations: ['team'],
    });

    if (!membership) {
      throw new NotFoundException(`Team player membership with ID ${id} not found`);
    }

    // Check authorization
    const team = await Team.findOne({ where: { id: membership.teamId } });
    const canEditTeam = user.hasAnyPermission([
      'edit-any:team',
      'edit-any:club',
      ...(team?.clubId ? [`${team.clubId}_edit:club`] : []),
    ]);
    if (!canEditTeam) {
      throw new UnauthorizedException('You do not have permission to modify team memberships');
    }

    // Update the membership type
    membership.membershipType = membershipType as TeamMembershipType;
    await membership.save();

    return membership;
  }

  @Mutation(() => TeamPlayerMembership)
  @UseGuards(PermGuard)
  async addTeamPlayerMembership(
    @User() user: Player,
    @Args('teamId', { type: () => ID }) teamId: string,
    @Args('playerId', { type: () => ID }) playerId: string,
    @Args('membershipType', { type: () => String, defaultValue: TeamMembershipType.REGULAR }) membershipType: string,
  ): Promise<TeamPlayerMembership> {
    // Validate membership type
    const validMembershipTypes = Object.values(TeamMembershipType);
    if (!validMembershipTypes.includes(membershipType as TeamMembershipType)) {
      throw new BadRequestException(`Invalid membership type. Must be one of: ${validMembershipTypes.join(', ')}`);
    }

    // Check if team exists
    const team = await Team.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    // Check authorization
    const canEditTeam = user.hasAnyPermission([
      'edit-any:team',
      'edit-any:club',
      ...(team.clubId ? [`${team.clubId}_edit:club`] : []),
    ]);
    if (!canEditTeam) {
      throw new UnauthorizedException('You do not have permission to modify team memberships');
    }

    // Check if player exists
    const player = await Player.findOne({
      where: { id: playerId },
    });

    if (!player) {
      throw new NotFoundException(`Player with ID ${playerId} not found`);
    }

    // Check if membership already exists
    const existingMembership = await TeamPlayerMembership.findOne({
      where: { teamId, playerId },
    });

    if (existingMembership) {
      throw new BadRequestException(`Player is already a member of this team`);
    }

    // Create new membership
    const membership = new TeamPlayerMembership();
    membership.teamId = teamId;
    membership.playerId = playerId;
    membership.membershipType = membershipType as TeamMembershipType;

    await membership.save();

    return membership;
  }

  @Mutation(() => Boolean)
  @UseGuards(PermGuard)
  async removeTeamPlayerMembership(
    @User() user: Player,
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    const membership = await TeamPlayerMembership.findOne({
      where: { id },
    });

    if (!membership) {
      throw new NotFoundException(`Team player membership with ID ${id} not found`);
    }

    // Check authorization
    const team = await Team.findOne({ where: { id: membership.teamId } });
    const canEditTeam = user.hasAnyPermission([
      'edit-any:team',
      'edit-any:club',
      ...(team?.clubId ? [`${team.clubId}_edit:club`] : []),
    ]);
    if (!canEditTeam) {
      throw new UnauthorizedException('You do not have permission to modify team memberships');
    }

    await membership.remove();

    return true;
  }

  @Mutation(() => Boolean)
  @UseGuards(PermGuard)
  async saveTeamBuilder(
    @User() user: Player,
    @Args('clubId', { type: () => ID }) clubId: string,
    @Args('season', { type: () => Number }) season: number,
    @Args('teams', { type: () => [TeamBuilderTeamInput] }) teams: TeamBuilderTeamInput[],
  ): Promise<boolean> {
    // Verify club exists
    const club = await Club.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException(`Club with ID ${clubId} not found`);
    }

    // Check authorization
    const canEdit = user.hasAnyPermission(['edit-any:club', `${clubId}_edit:club`]);
    if (!canEdit) {
      throw new UnauthorizedException('You do not have permission to manage teams for this club');
    }

    for (const teamInput of teams) {
      let team: Team;

      if (teamInput.teamId) {
        const existing = await Team.findOne({ where: { id: teamInput.teamId } });

        if (existing && existing.season === season) {
          team = existing;
        } else if (existing) {
          // Clone from current-season team for next season
          team = new Team();
          team.clubId = clubId;
          team.season = season;
          team.link = existing.link;
        } else {
          throw new NotFoundException(`Team with ID ${teamInput.teamId} not found`);
        }
      } else {
        team = new Team();
        team.clubId = clubId;
        team.season = season;
      }

      team.name = teamInput.name;
      team.type = teamInput.type;
      if (teamInput.teamNumber != null) team.teamNumber = teamInput.teamNumber;
      if (teamInput.preferredDay != null) team.preferredDay = teamInput.preferredDay as Days;
      if (teamInput.captainId != null) team.captainId = teamInput.captainId;

      await team.save();

      // Remove existing memberships for this team
      const existingMemberships = await TeamPlayerMembership.find({
        where: { teamId: team.id },
      });
      if (existingMemberships.length > 0) {
        await TeamPlayerMembership.remove(existingMemberships);
      }

      // Create new memberships
      for (const playerInput of teamInput.players) {
        const membership = new TeamPlayerMembership();
        membership.teamId = team.id;
        membership.playerId = playerInput.playerId;
        membership.membershipType = playerInput.membershipType as TeamMembershipType;
        await membership.save();
      }
    }

    return true;
  }

  @Mutation(() => [Player])
  @UseGuards(PermGuard)
  async createPlayersForTeamBuilder(
    @User() user: Player,
    @Args('clubId', { type: () => ID }) clubId: string,
    @Args('players', { type: () => [CreatePlayerForTeamBuilderInput] }) players: CreatePlayerForTeamBuilderInput[],
  ): Promise<Player[]> {
    const club = await Club.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException(`Club with ID ${clubId} not found`);
    }

    const canEdit = user.hasAnyPermission(['edit-any:club', `${clubId}_edit:club`]);
    if (!canEdit) {
      throw new UnauthorizedException('You do not have permission to manage players for this club');
    }

    const createdPlayers: Player[] = [];

    for (const input of players) {
      const firstName = input.firstName?.trim();
      const lastName = input.lastName?.trim();

      if (!firstName || !lastName) {
        throw new BadRequestException('firstName and lastName are required');
      }

      const newPlayer = new Player();
      newPlayer.firstName = firstName;
      newPlayer.lastName = lastName;
      newPlayer.gender = (input.gender === 'M' || input.gender === 'F') ? input.gender : undefined;
      newPlayer.slug = this.generatePlayerSlug(firstName, lastName);
      newPlayer.competitionPlayer = true;
      await newPlayer.save();

      // Create club membership
      const membership = new ClubPlayerMembership();
      membership.playerId = newPlayer.id;
      membership.clubId = clubId;
      membership.start = new Date();
      membership.confirmed = true;
      membership.membershipType = ClubMembershipType.NORMAL;
      await membership.save();

      createdPlayers.push(newPlayer);
    }

    return createdPlayers;
  }

  private generatePlayerSlug(firstName: string, lastName: string): string {
    const base = `${firstName}-${lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    // Add random suffix to ensure uniqueness
    const suffix = Math.random().toString(36).substring(2, 8);
    return `${base}-${suffix}`;
  }
}
