import {commitMutation} from 'react-relay';
import {showInfo} from 'universal/modules/toast/ducks/toastDuck';
import handleAddTeamMembers from 'universal/mutations/handlers/handleAddTeamMembers';
import handleAddTeams from 'universal/mutations/handlers/handleAddTeams';
import handleRemoveInvitations from 'universal/mutations/handlers/handleRemoveInvitations';
import handleRemoveNotifications from 'universal/mutations/handlers/handleRemoveNotifications';
import getInProxy from 'universal/utils/relay/getInProxy';
import handleRemoveSoftTeamMembers from 'universal/mutations/handlers/handleRemoveSoftTeamMembers';
import handleUpsertTasks from 'universal/mutations/handlers/handleUpsertTasks';
import getGraphQLError from 'universal/utils/relay/getGraphQLError';
import jwtDecode from 'jwt-decode';
import {setAuthToken} from 'universal/redux/authDuck';
import {setWelcomeActivity} from 'universal/modules/userDashboard/ducks/settingsDuck';
import handleOnCompletedToastError from 'universal/mutations/handlers/handleOnCompletedToastError';

graphql`
  fragment AcceptTeamInviteMutation_invitation on AcceptTeamInvitePayload {
    removedInvitation {
      id
      teamId
    }
  }
`;

graphql`
  fragment AcceptTeamInviteMutation_teamMember on AcceptTeamInvitePayload {
    teamMember {
      ...CompleteTeamMemberFrag @relay(mask: false)
    }
    team {
      name
      # alternatively, we could just send down the single stage
      newMeeting {
        ...CompleteNewMeetingFrag @relay(mask: false)
      }
    }
    removedSoftTeamMember {
      id
      teamId
    }
  }
`;

graphql`
  fragment AcceptTeamInviteMutation_task on AcceptTeamInvitePayload {
    hardenedTasks {
      ...CompleteTaskFrag @relay(mask: false)
    }
  }
`;

graphql`
  fragment AcceptTeamInviteMutation_team on AcceptTeamInvitePayload {
    team {
      ...CompleteTeamFrag @relay(mask: false)
    }
    authToken
    removedNotification {
      id
    }
    user {
      ...UserAnalyticsFrag @relay(mask: false)
    }
  }
`;

const mutation = graphql`
  mutation AcceptTeamInviteMutation($notificationId: ID, $inviteToken: ID) {
    acceptTeamInvite(notificationId: $notificationId, inviteToken: $inviteToken) {
      error {
        message
        title
      }
      ...AcceptTeamInviteMutation_team @relay(mask: false)
    }
  }
`;

const popJoinedYourTeamToast = (payload, dispatch) => {
  const teamName = getInProxy(payload, 'team', 'name');
  const preferredName = getInProxy(payload, 'teamMember', 'preferredName');
  if (!preferredName) return;
  dispatch(showInfo({
    autoDismiss: 10,
    title: 'Ahoy, a new crewmate!',
    message: `${preferredName} just joined team ${teamName}`
  }));
};

export const acceptTeamInviteTeamUpdater = (payload, store, viewerId) => {
  const team = payload.getLinkedRecord('team');
  handleAddTeams(team, store, viewerId);

  const notificationId = getInProxy(payload, 'removedNotification', 'id');
  handleRemoveNotifications(notificationId, store, viewerId);
};

export const acceptTeamInviteTeamMemberUpdater = (payload, store, viewerId, dispatch) => {
  const teamMember = payload.getLinkedRecord('teamMember');
  handleAddTeamMembers(teamMember, store);

  const removedSoftTeamMember = payload.getLinkedRecord('removedSoftTeamMember');
  handleRemoveSoftTeamMembers(removedSoftTeamMember, store);

  popJoinedYourTeamToast(payload, dispatch);
};

export const acceptTeamInviteTaskUpdater = (payload, store, viewerId) => {
  const hardenedTasks = payload.getLinkedRecords(payload, 'hardenedTasks');
  handleUpsertTasks(hardenedTasks, store, viewerId);
};

export const acceptTeamInviteInvitationUpdater = (payload, store) => {
  const invitation = payload.getLinkedRecord('removedInvitation');
  handleRemoveInvitations(invitation, store);
};

const AcceptTeamInviteMutation = (environment, variables, {dispatch, history}, onError, onCompleted) => {
  const {viewerId} = environment;
  return commitMutation(environment, {
    mutation,
    variables,
    updater: (store) => {
      const payload = store.getRootField('acceptTeamInvite');
      if (!payload) return;
      acceptTeamInviteTeamUpdater(payload, store, viewerId);
    },
    onError,
    onCompleted: (data, errors) => {
      if (onCompleted) {
        onCompleted(data, errors);
      }
      const serverError = getGraphQLError(data, errors);
      if (serverError) {
        handleOnCompletedToastError(serverError, dispatch);
        // give them the benefit of the doubt & don't sign them out
        history.push('/');
        return;
      }
      const {acceptTeamInvite: {team, authToken, user}} = data;
      const {id: teamId, name: teamName} = team;
      const {tms} = jwtDecode(authToken);
      dispatch(setAuthToken(authToken, user));
      dispatch(showInfo({
        autoDismiss: 10,
        title: 'Congratulations!',
        message: `You’ve been added to team ${teamName}`,
        action: {label: 'Great!'}
      }));
      if (tms.length <= 1) {
        dispatch(setWelcomeActivity(`/team/${teamId}`));
        history.push('/me/settings');
      } else {
        history.push(`/team/${teamId}`);
      }
    }
  });
};

export default AcceptTeamInviteMutation;
