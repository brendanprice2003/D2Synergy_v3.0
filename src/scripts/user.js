console.log('%cD2 SYNERGY', 'font-weight: bold;font-size: 40px;color: white;');
console.log('// Welcome to D2Synergy, Please report any errors to @_devbrendan on Twitter.');

// Import modules
import axios from 'axios';
import { ValidateManifest, ReturnEntry } from './modules/ValidateManifest.js';
import {
    VerifyState,
    StartLoad,
    StopLoad,
    RedirUser,
    LoadPrimaryCharacter,
    parsePropertyNameIntoWord,
    CacheAuditItem,
    AddTableRow } from './modules/ModuleScript.js';
import {
    ActivityMode,
    Destination,
    DamageType,
    AmmoType,
    ItemCategory,
    KillType,
    EnemyType,
    EnemyModifiers,
    SeasonalCategory,
    LocationSpecifics,
    DescriptorSpecifics } from './modules/SynergyDefinitions.js';
import { AddEventListeners, BuildWorkspace } from './modules/Events.js';
import { MakeRequest } from './modules/MakeRequest.js';


// Validate state parameter
VerifyState();

// Start load animation
StartLoad();

// Utilities
const urlParams = new URLSearchParams(window.location.search),
    sessionStorage = window.sessionStorage,
    localStorage = window.localStorage,
    log = console.log.bind(console);
var startTime = new Date().getTime();


// Defintion objects
export var progressionDefinitions = {},
        presentationNodeDefinitions = {},
        seasonPassDefinitions = {},
        objectiveDefinitions = {},
        destinyUserProfile = {},
        seasonDefinitions = {},
        recordDefinitions = {},
        vendorDefinitions = {},
        itemDefinitions = {};

// Authorization information
export const homeUrl = import.meta.env.HOME_URL,
             axiosHeaders = {
                ApiKey: import.meta.env.API_KEY,
                Authorization: import.meta.env.AUTH
             },
             clientId = import.meta.env.CLIENT_ID;

// Set default axios header
axios.defaults.headers.common = {
    "X-API-Key": `${axiosHeaders.ApiKey}`
};


// Collate all definition arrays into one array
export var allProgressionProperties = [];
allProgressionProperties.push(
    ...Destination,
    ...ActivityMode,
    ...DamageType,
    ...ItemCategory,
    ...AmmoType,
    ...KillType,
    ...EnemyType,
    ...EnemyModifiers,
    ...SeasonalCategory,
    ...LocationSpecifics,
    ...DescriptorSpecifics);

// Progression properties and their corresponding key names
export var progressionPropertyKeyValues = {
    'Destination': Destination,
    'ActivityMode': ActivityMode,
    'DamageType': DamageType,
    'ItemCategory': ItemCategory,
    'AmmoType': AmmoType,
    'KillType': KillType,
    'EnemyType': EnemyType,
    'EnemyModifiers': EnemyModifiers,
    'SeasonalCategory': SeasonalCategory,
    'LocationSpecifics': LocationSpecifics,
    'DescriptorSpecifics': DescriptorSpecifics
};

// User vars
let destinyMembershipId,
    membershipType,
    characters;


export var ProfileProgressions;
export var CurrentSeasonHash;

// Object holds all bounties, by vendor, that are to be excluded from permutations
export var excludedBountiesByVendor = {};


// Declare global vars and exports
export var charBounties = [];

// Currently selected view page
export var contentView = { 
    currentView: {},
    UpdateView: function(element) {
        this.currentView = element;
    }
};

// Deprecated for now
export var eventBooleans = {
    areFiltersToggled: false, // Default
    ReverseBoolean: function(bool) {
        bool = !bool;
        return bool;
    }
};
export var eventFilters = {
    filterDivs: {},
    grayedOutBounties: [],
    UpdateFilters: function(value) {
        this.filterDivs = value;
    }
};

// Item display size global
export var itemDisplay = {
    itemDisplaySize: 55, // Default
    UpdateItemSize: function(size) {

        // Update global & cache
        this.itemDisplaySize = size;
        CacheAuditItem('itemDisplaySize', size);

        // Update dom content
        document.getElementById('accessibilityImageDemo').style.width = `${size}px`;
    }
};

// Accent color global
export var accentColor = {
    currentAccentColor: '#ED4D4D', // Default
    UpdateAccentColor: function(color) {

        // Update global & cache
        this.currentAccentColor = color;
        CacheAuditItem('accentColor', color);

        // Update dom content
        document.getElementById('topColorBar').style.backgroundColor = color;
        document.getElementById('topColorBar').style.boxShadow = `0px 0px 10px 1px ${color}`;
        document.getElementById('notificationTopBgLine').style.backgroundColor = color;
        document.getElementById('notificationTopBgLine').style.boxShadow = `0px 0px 10px 1px ${color}`;
        
        // Range sliders
        for (let element of document.getElementsByClassName('settingRange')) {
            element.style.accentColor = color;
        };
        // Checkboxes
        for (let element of document.getElementsByClassName('settingCheckbox')) {
            element.style.accentColor = color;
        };
    }
};

// Relations table metadata
export var relationsTable = {
    div: {}, // DOM element
    relations: {
        bounties: {},
        challenges: {},
        all: {}
    },
    ClearTable: function() {
        this.div.innerHTML = '';
        this.div.innerHTML = '<tr><th>Item</th><th>Category</th><th>Relation</th></tr>';
    },
    BuildTable: function(type = 'all') {
        
        // Clear table
        this.ClearTable();
        log(this.relations);
        // Update table, looping over type
        for (let relation in this.relations[type]) {

            let itemName = relation;
            let itemRelation = this.relations[type][relation];
            let itemCategory;
            for (let item in progressionPropertyKeyValues) {

                // If relation is in category, store in category
                if (progressionPropertyKeyValues[item].includes(parsePropertyNameIntoWord(itemName, true))) {
                    itemCategory = item;
                };
            };

            AddTableRow(this.div, [itemName, parsePropertyNameIntoWord(itemCategory), `${itemRelation}pts`]);
        };

        // Update relation count
        document.getElementById('relationsTotalField').innerHTML = Object.keys(this.relations[type]).length;
    }
};


// Parse properties into words that can be matched to item descriptors
allProgressionProperties = allProgressionProperties.map(property => parsePropertyNameIntoWord(property));

// Register service worker to load definitions (non blocking)
const registerDefinitionsServiceWorker = async function () {

    // Check if service worker is supported
    if ('serviceWorker' in navigator) {
        const serviceWorker = await navigator.serviceWorker.register('./sw.js', { scope: './', type: 'module' });

        log('🥝 Installing Service Worker');
        if (serviceWorker.active) {
            log('🥝 Service Worker Active');
    
            serviceWorker.active.postMessage('🥝 HELLO FROM MAIN');
    
            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                log('🥝', event.data);
            });
        };

        return;
    };

    // Else do conventional fetch
    // -- something
};



// Main OAuth flow mechanism
export async function OAuthFlow() {

    log('-> OAuthFlow Called');

    let rsToken = JSON.parse(localStorage.getItem('refreshToken')),
        acToken = JSON.parse(localStorage.getItem('accessToken')),
        comps = JSON.parse(localStorage.getItem('components')),
        authCode = urlParams.get('code'); // ONLY place where authCode is to be fetched from

        // Remove state and auth code from url
        window.history.pushState({}, document.title, window.location.pathname);

    // Wrap in try.except for error catching
    try {
        // If user has no localStorage items and the code is incorrect
        if (authCode && (!comps || !acToken || !rsToken)) {
            await BungieOAuth(authCode);
        }
        // User has no credentials, fired before other conditions
        else if (!authCode && (!comps || !acToken || !rsToken)) {
            window.location.href = homeUrl;
        }

        // When user comes back with localStorage components but without param URL
        else if (!authCode && (comps || acToken || rsToken)) {
            await CheckComponents();
        }

        // Otherwise, redirect the user back to the 'Authorize' page
        else {
            window.location.href = homeUrl;
        };
    } catch (error) {
        console.error(error); // display error page, with error and options for user
    };
    log(`-> OAuth Flow Finished [Elapsed: ${new Date().getTime() - startTime}ms]`);
};



// Authorize with Bungie.net
// @string {authCode}
export async function BungieOAuth (authCode) {

    let AccessToken = {},
        RefreshToken = {},
        components = {},
        AuthConfig = {
            headers: {
                'X-API-Key': axiosHeaders.ApiKey,
                Authorization: `Basic ${axiosHeaders.Authorization}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        log(axiosHeaders.Authorization);

    // Authorize user and get credentials (first time sign-on (usually))
    await axios.post('https://www.bungie.net/platform/app/oauth/token', `grant_type=authorization_code&code=${authCode}`, AuthConfig)
        .then(res => {

            let data = res.data;
            log(res);

            components['membership_id'] = data['membership_id'];
            components['token_type'] = data['token_type'];
            components['authorization_code'] = authCode;

            AccessToken['inception'] = Math.round(new Date().getTime() / 1000); // Seconds
            AccessToken['expires_in'] = data['expires_in'];
            AccessToken['value'] = data['access_token'];

            RefreshToken['inception'] = Math.round(new Date().getTime() / 1000); // Seconds
            RefreshToken['expires_in'] = data['refresh_expires_in'];
            RefreshToken['value'] = data['refresh_token'];

            localStorage.setItem('accessToken', JSON.stringify(AccessToken));
            localStorage.setItem('components', JSON.stringify(components));
            localStorage.setItem('refreshToken', JSON.stringify(RefreshToken));

            log('-> Authorized with Bungie.net');
        })
        .catch(err => {
            if (err.response.data['error_description'] == 'AuthorizationCodeInvalid' || err.response.data['error_description'] == 'AuthorizationCodeStale') {
                window.location.href = `https://www.bungie.net/en/oauth/authorize?&client_id=${clientId}&response_type=code`;
                return;
            };
            console.error(err);
        });
};



// Check tokens for expiration
export async function CheckComponents () {
    
    let acToken = JSON.parse(localStorage.getItem('accessToken')),
        rsToken = JSON.parse(localStorage.getItem('refreshToken')),
        comps = JSON.parse(localStorage.getItem('components')),
        RefreshToken = {},
        AccessToken = {},
        components = {},
        AuthConfig = {
            headers: {
                Authorization: `Basic ${axiosHeaders.Authorization}`,
                "Content-Type": "application/x-www-form-urlencoded"
            }
        };


    // Remove invalid localStorage items & Redirect if items are missing
    var keyNames = ['value', 'inception',  'expires_in', 'membership_id', 'token_type', 'authorization_code'],
        cKeys = ['membership_id', 'token_type', 'authorization_code'],
        tokenKeys = ['inception', 'expires_in', 'value'];


    Object.keys(rsToken).forEach(item => {
        if (!keyNames.includes(item)) delete rsToken[item], localStorage.setItem('refreshToken', JSON.stringify(rsToken));
    });
    Object.keys(acToken).forEach(item => {
        if (!keyNames.includes(item)) delete acToken[item], localStorage.setItem('accessToken', JSON.stringify(acToken));
    });
    Object.keys(comps).forEach(item => {
        if (!keyNames.includes(item)) delete comps[item], localStorage.setItem('components', JSON.stringify(comps));
    });

    Object.keys(tokenKeys).forEach(item => {
        if (!Object.keys(rsToken).includes(tokenKeys[item])) RedirUser(homeUrl, 'rsToken=true');
        if (!Object.keys(acToken).includes(tokenKeys[item])) RedirUser(homeUrl, 'acToken=true');
    });
    Object.keys(cKeys).forEach(item => {
        if (!Object.keys(comps).includes(cKeys[item])) RedirUser(homeUrl, 'comps=true');
    });


    // Check if either tokens have expired
    let isAcTokenExpired = (acToken.inception + acToken['expires_in']) <= Math.round(new Date().getTime() / 1000) - 1,
        isRsTokenExpired = (rsToken.inception + rsToken['expires_in']) <= Math.round(new Date().getTime() / 1000) - 1;
    if (isAcTokenExpired || isRsTokenExpired) {

        // Temporary deletion => Default headers are added back after OAuthFlow mechanisms
        // delete axios.defaults.headers.common['X-API-Key'];

        // If either tokens have expired
        isAcTokenExpired ? log('-> Access token expired..') : log('-> Refresh token expired..');
        await axios.post('https://www.bungie.net/Platform/App/OAuth/token/', `grant_type=refresh_token&refresh_token=${rsToken.value}`, AuthConfig)
            .then(res => {

                let data = res.data;
                components["membership_id"] = data["membership_id"];
                components["token_type"] = data["token_type"];
                components["authorization_code"] = comps["authorization_code"];

                AccessToken['inception'] = Math.round(new Date().getTime() / 1000); // Seconds
                AccessToken['expires_in'] = data['expires_in'];
                AccessToken['value'] = data['access_token'];

                RefreshToken['inception'] = Math.round(new Date().getTime() / 1000); // Seconds
                RefreshToken['expires_in'] = data['refresh_expires_in'];
                RefreshToken['value'] = data['refresh_token'];

                localStorage.setItem('accessToken', JSON.stringify(AccessToken));
                localStorage.setItem('components', JSON.stringify(components));
                localStorage.setItem('refreshToken', JSON.stringify(RefreshToken));
            })
            .catch(err => {
                console.error(err);
                switch (err.response.data['error_description']) {
                    case 'AuthorizationCodeInvalid':
                    case 'AuthorizationCodeStale':
                    case 'ProvidedTokenNotValidRefreshToken':
                        // Restart OAuthFlow
                        localStorage.clear();
                        sessionStorage.clear();
                        indexedDB.deleteDatabase('keyval-store');
                        window.location.href = `https://www.bungie.net/en/oauth/authorize?&client_id=${clientId}&response_type=code`;
                };
            });
        isAcTokenExpired ? log('-> Access Token Refreshed!') : log('-> Refresh Token Refreshed!');
    };
    log(`-> Tokens Validated [${new Date().getTime() - startTime}ms]`);
};



// Fetch bungie user data
export async function FetchBungieUserDetails() {

    log('-> FetchBungieUserDetails Called');

    await CheckComponents();

    let components = JSON.parse(localStorage.getItem('components')),
        axiosConfig = {
            headers: {
                Authorization: `Bearer ${JSON.parse(localStorage.getItem('accessToken')).value}`,
                "X-API-Key": `${axiosHeaders.ApiKey}`
            }
        };
        log(JSON.parse(localStorage.getItem('accessToken')).value);
        

    // Variables to check/store
    membershipType = sessionStorage.getItem('membershipType'),
    destinyMembershipId = JSON.parse(sessionStorage.getItem('destinyMembershipId')),
    destinyUserProfile = JSON.parse(sessionStorage.getItem('destinyUserProfile'));

    // Check cached data
    if (!membershipType || !membershipType) {

        // GetBungieNetUserById (uses 254 as membershipType)
        await axios.get(`https://www.bungie.net/Platform/Destiny2/254/Profile/${components.membership_id}/LinkedProfiles/?getAllMemberships=true`, axiosConfig)
            .then(response => {

                // Store response
                destinyMembershipId = response.data.Response.profiles[0].membershipId;
                membershipType = response.data.Response.profiles[0].membershipType;

                // Cache in sessionStorage
                sessionStorage.setItem('membershipType', membershipType);
                sessionStorage.setItem('destinyMembershipId', JSON.stringify(destinyMembershipId));
            })
            .catch((error) => {
                console.error(error);
            });
    };

    // GetProfile
    await axios.get(`https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${destinyMembershipId}/?components=100,104,200,201,202,205,300,301,305,900,1200`, axiosConfig)
        .then(response => {
                
            // Store in memory again
            log(response);
            destinyUserProfile = response.data.Response;

            // Parse data from destinyUserProfile
            CurrentSeasonHash = destinyUserProfile.profile.data.currentSeasonHash;
            ProfileProgressions = destinyUserProfile.profileProgression.data;

            // Cache in sessionStorage
            sessionStorage.setItem('destinyUserProfile', JSON.stringify(destinyUserProfile));
        })
        .catch((error) => {
            console.error(error);
        });
        
    characters = destinyUserProfile.characters.data;
    log(`Current season hash: ${CurrentSeasonHash}`);
    log(`-> FetchBungieUserDetails Finished [${new Date().getTime() - startTime}ms]`);
};



// Anonymous function for main
// @boolean {isPassiveReload}
export async function MainEntryPoint(isPassiveReload) {

    // Check for passive reload
    if (isPassiveReload) {
        startTime = new Date().getTime();
        StartLoad();
        document.getElementById('containerThatHasTheSideSelectionAndContentDisplay').style.display = 'none';
        log(`-> Passive Reload Started..`);
    };

    // Change notification label content
    document.getElementById('notificationTitle').innerHTML = 'Loading Bungie Data';
    document.getElementById('notificationMessage').innerHTML = 'Waiting for Bungie.net..';

    // OAuth Flow
    await OAuthFlow();

    // Add default headers back, in case OAuthFlow needed a refresh
    axios.defaults.headers.common = { "X-API-Key": `${axiosHeaders.ApiKey}` };

    // Fetch bungie user details
    await FetchBungieUserDetails();

    // Validate and fetch manifest
    await ValidateManifest();

    // Assign defintions to their global counterparts
    progressionDefinitions = await ReturnEntry('DestinyProgressionDefinition');
    seasonPassDefinitions = await ReturnEntry('DestinySeasonPassDefinition');
    objectiveDefinitions = await ReturnEntry('DestinyObjectiveDefinition');
    seasonDefinitions = await ReturnEntry('DestinySeasonDefinition');
    itemDefinitions = await ReturnEntry('DestinyInventoryItemDefinition');
    recordDefinitions = await ReturnEntry('DestinyRecordDefinition');
    presentationNodeDefinitions = await ReturnEntry('DestinyPresentationNodeDefinition');

    // Load first char on profile/last loaded char
    log(characters);
    await LoadPrimaryCharacter(characters);

    // Check for passive reload
    if (isPassiveReload) {
        StopLoad();
        document.getElementById('containerThatHasTheSideSelectionAndContentDisplay').style.display = 'flex';
        log(`-> Passive Reload Finished [Elapsed: ${(new Date().getTime() - startTime)}ms]`);
        return;
    };

    // Don't add the event listeners again when passive reloading
    await AddEventListeners();
    return;
};



// Run after DOM load
document.addEventListener('DOMContentLoaded', () => {

    // Test server availability
    MakeRequest(`https://www.bungie.net/Platform/Destiny2/1/Profile/4611686018447977370/?components=100`, {headers: {"X-API-Key": axiosHeaders.ApiKey}}, {scriptOrigin: 'user', avoidCache: true})
    .then((response) => {
        log(response);
    })
    .catch((error) => {
        console.error(error);
    });

    // Build workspace -- default fields etc.
    BuildWorkspace()
    .catch((error) => {
        console.error(error);
    });

    // Build definitions using service worker
    registerDefinitionsServiceWorker()
    .catch((error) => {
        console.error(`🥝 Service Worker Error: ${error}`);
    });

    // Run main
    MainEntryPoint()
    .catch((error) => {
        console.error(error);
    });
});
