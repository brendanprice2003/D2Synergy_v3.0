import { 
    axiosHeaders, 
    UserProfile,
    UserXpModifiers,
    userTrasistoryData,
    seasonDefinitions, log } from '../user.js';
import { MakeRequest } from './MakeRequest.js';
import { GenerateRandomString } from './GenerateRandomString.js';
import { FetchPrimaryUserMembership } from './FetchPrimaryUserMembership.js';

// Fetch transistory data from current user
export function FetchUserTransistory() {

    // Fetch config + Query params
    // const membershipType = UserProfile.membershipType;
    // const destinyMembershipId = UserProfile.destinyMembershipId;
    const axiosConfig = {
        headers: {
            Authorization: `Bearer ${JSON.parse(window.localStorage.getItem('accessToken')).value}`,
            "X-API-Key": `${axiosHeaders.ApiKey}`
        }
    };

    // Request user's transistory data
    MakeRequest(`https://www.bungie.net/Platform/Destiny2/3/Profile/4611686018471667515/?components=1000&cachebust=${GenerateRandomString(12)}`, axiosConfig)
    .then((response) => {

        const transistoryData = response.data.Response.profileTransitoryData;
        let fireteamMembers = [];

        // Check if user is in a fireteam and store fireteam members
        if (transistoryData.data) {
            if (transistoryData.data.partyMembers.length > 1) {

                // Store fireteam members
                fireteamMembers = transistoryData.data.partyMembers;

                // Exclude user from fireteam members
                fireteamMembers = fireteamMembers.filter((member) => {
                    return parseInt(member.membershipId) !== 4611686018471667515;
                });

                // Get user with highest season pass rank
                FindHighestUser(fireteamMembers);
                return;
            };
        };

        // User is not in a fireteam
        log('User is not in a fireteam');

    })
    .catch((error) => {
        console.error(error);
    });
};

async function FindHighestUser(fireteamMembers) {

    // ..
    let highestSeasonRankFromMembers = 0;
    const axiosConfig = {
        headers: {
            Authorization: `Bearer ${JSON.parse(window.localStorage.getItem('accessToken')).value}`,
            "X-API-Key": `${axiosHeaders.ApiKey}`
        }
    };

    for (let user of fireteamMembers) {

        // ..
        let userDestinyMembershipId = user.membershipId;
        let userDestinyMembershipType;

        // Fetch the primary user profile
        const primaryUserProfile = await FetchPrimaryUserMembership(userDestinyMembershipId);
        userDestinyMembershipType = primaryUserProfile.membershipType;

        // Fetch progressions and store highest rank
        await MakeRequest(`https://www.bungie.net/Platform/Destiny2/${userDestinyMembershipType}/Profile/${userDestinyMembershipId}/?components=202`, axiosConfig)
        .then((response) => {

            let characters = response.data.Response.characterProgressions.data;
            let characterProgressions = characters[Object.keys(characters)[0]].progressions;
            let seasonProgression = characterProgressions[seasonDefinitions[UserProfile.currentSeasonHash].seasonPassProgressionHash];
            let seasonRank = seasonProgression.level;

            if (seasonRank === 100) {
                highestSeasonRankFromMembers = seasonRank;
                return;
            };

            if (seasonRank > highestSeasonRankFromMembers) {
                highestSeasonRankFromMembers = seasonRank;
            };
        })
        .catch((error) => {
            console.error(error);
        });

        userTrasistoryData.AssignTransistoryData('highestSeasonPassRankInFireteam', highestSeasonRankFromMembers);
    };
};
