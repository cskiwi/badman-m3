import { AllowAnonymous, PermGuard, User } from '@app/backend-authorization';
import { Player, Team, TeamPlayerMembership, TeamUpdateInput } from '@app/models';
import { TeamMembershipType } from '@app/models-enum';
import { IsUUID } from '@app/utils';
import { BadRequestException, NotFoundException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Args, ID, Parent, Query, ResolveField, Resolver, Mutation, Field, InputType, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsUUID as IsUUIDValidator, IsOptional } from 'class-validator';
import { TeamArgs } from '../args';

// Register the enum for GraphQL
registerEnumType(TeamMembershipType, {
  name: 'TeamMembershipType',
  description: 'The type of team membership',
});

@InputType('UpdateTeamPlayerMembershipInput', { description: 'Input for updating team player membership' })
export class UpdateTeamPlayerMembershipInput {
  @Field(() => ID, { description: 'Team player membership ID' })
  @IsUUIDValidator()
  id!: string;

  @Field(() => TeamMembershipType, { description: 'New membership type' })
  @IsEnum(TeamMembershipType)
  membershipType!: TeamMembershipType;
}

@InputType('AddTeamPlayerMembershipInput', { description: 'Input for adding team player membership' })
export class AddTeamPlayerMembershipInput {
  @Field(() => ID, { description: 'Team ID' })
  @IsUUIDValidator()
  teamId!: string;

  @Field(() => ID, { description: 'Player ID' })
  @IsUUIDValidator()
  playerId!: string;

  @Field(() => TeamMembershipType, { description: 'Membership type', defaultValue: TeamMembershipType.REGULAR })
  @IsEnum(TeamMembershipType)
  membershipType!: TeamMembershipType;
}

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
  async teamPlayerMemberships(@Parent() { id }: Team) {
    return TeamPlayerMembership.find({
      where: {
        teamId: id,
      },
    });
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

    // Check authorization - only users with edit-any:team claim can modify team memberships
    const canEditTeam = user.hasAnyPermission(['edit-any:team', 'edit-any:club']);
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

    // Check authorization - only users with edit-any:team claim can add team memberships
    const canEditTeam = user.hasAnyPermission(['edit-any:team', 'edit-any:club']);
    if (!canEditTeam) {
      throw new UnauthorizedException('You do not have permission to modify team memberships');
    }

    // Check if team exists
    const team = await Team.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
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
}
