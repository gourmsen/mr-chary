const { Client, Intents, Collection, MessageEmbed } = require("discord.js");
require('better-logging')(console);

var MESSAGE, ARGS;

const STAT_OPEN = 'Open';
const STAT_STARTED = 'Started';
const STAT_CLOSED = 'Closed';

const ERR_CONTEST_NOT_FOUND = 1;
const ERR_ENTRY_COUNT = 2;
const ERR_OBJECTIVE_MINIMUM = 3;
const ERR_ALREADY_JOINED = 4;
const ERR_NO_CONTESTS = 5;
const ERR_ONLY_AUTHOR = 6;
const ERR_SAME_STATE = 7;
const ERR_DEAD_CONTEST = 8;
const ERR_NOT_STARTED = 9;
const ERR_MAXIMUM_ENTRIES = 10;
const ERR_NOT_NUMERIC = 11;
const ERR_NOT_ATTENDING = 12;
const ERR_NOT_OPEN = 13;
const ERR_ROUND_COUNT = 14;

module.exports = {
    name: 'contest',
    description: "Contest Manager!",
    execute(message, args) {

        MESSAGE = message;
        ARGS = args;

        switch(ARGS[0]) {
            // functions
            case "c":
            case "create":
                createContest();
                break;
            case "j":
            case "join":
                joinContest();
                break;
            case "a":
            case "add":
                entryContest();
                break;

            // information
            case "i":
            case "info":
                infoContest();
                break;
            case "l":
            case "list":
                listContests();
                break;
            case "p":
            case "personal":
                personalStats();
                break;

            // states
            case "s":
            case "start":
                stateContest(STAT_STARTED);
                break;
            case "r":
            case "round":
                roundContest();
                break;
            case "e":
            case "end":
                stateContest(STAT_CLOSED);
                break;
            default:
                break;
        }
    }
}

function createContest() {
    const fs = require('fs');
    const crypto = require('crypto');

    var contestId, filePath, contestCreationDate, contestState, contestAuthorId, contestAuthorName, contestEntryCount, contestCurrentRound, contestMaxRoundCount, contestObjectives;

    // generate unique contest id
    contestId = crypto.randomBytes(3).toString("hex");
    filePath = 'res/contests/' + contestId + '.json';
    while (true) {
        if (!fs.existsSync(filePath)) {
            break;
        }

        contestId = crypto.randomBytes(3).toString("hex");
        filePath = 'res/contests/' + contestId + '.json';
    }

    // basic fields
    contestCreationDate = new Date().toJSON();

    contestState = STAT_OPEN;
    contestAuthorId = MESSAGE.author.id;
    contestAuthorName = MESSAGE.author.username;

    // check for entry count
    if (ARGS.length < 2) {
        MESSAGE.channel.send("Enter the allowed entry count (0 for unlimited)...");
        return ERR_ENTRY_COUNT;
    }

    // entry count
    contestEntryCount = parseInt(ARGS[1]);
    if (isNaN(contestEntryCount)) {
        MESSAGE.channel.send("Enter a numeric value for the entry count...");
        return ERR_NOT_NUMERIC;
    }

    contestCurrentRound = 1;

    // check for maximum round count
    if (ARGS.length < 3) {
        MESSAGE.channel.send("Enter the maximum round count (0 for unlimited)...");
        return ERR_ROUND_COUNT;
    }

    // maximum round count
    contestMaxRoundCount = parseInt(ARGS[2]);
    if (isNaN(contestMaxRoundCount)) {
        MESSAGE.channel.send("Enter a numeric value for the maximium round count...");
        return ERR_NOT_NUMERIC;
    }

    // check for objectives
    if (ARGS.length < 4) {
        MESSAGE.channel.send("Enter at least one objective...");
        return ERR_OBJECTIVE_MINIMUM;
    }

    // contest objectives
    contestObjectives = [];

    var objectiveName, objectiveValue;
    for (var i = 3; i < ARGS.length; i++) {
        objectiveName = ARGS[i].substr(0, ARGS[i].indexOf('='));
        objectiveValue = parseInt(ARGS[i].split('=')[1]);
        if (isNaN(objectiveValue)) {
            MESSAGE.channel.send("Enter a numeric value for objective `" + objectiveName + "`..." );
            return ERR_NOT_NUMERIC;
        }

        objectivePair = {
            "name": objectiveName,
            "value": objectiveValue
        }

        contestObjectives.push(objectivePair);
    }

    // prepare contest data
    var contestData = {
        "contest": {
            "id": contestId,
            "creationDate": contestCreationDate,
            "state": contestState,
            "authorId": contestAuthorId,
            "authorName": contestAuthorName,
            "entryCount": contestEntryCount,
            "currentRound": contestCurrentRound,
            "maxRoundCount": contestMaxRoundCount,
            "rated": false,
            "objectives": contestObjectives
        },
        "attendees": []
    };

    // create contest file
    writeContestData(contestId, contestData);

    MESSAGE.channel.send("Contest `" + contestId + "` created!");
    console.info(contestAuthorName + ' (' + contestAuthorId + ') ' + "has created contest '" + contestId + "'!");

    printContestSheet(contestId);
}

function joinContest() {
    var contestId, contestData, attendeeId, attendeeName;

    contestId = ARGS[1];
    contestData = getContestData(contestId);
    if (contestData === ERR_CONTEST_NOT_FOUND) return;

    // only joinable, when in open state
    if (contestData.contest.state !== STAT_OPEN) {
        MESSAGE.channel.send("Contest can't be joined anymore...");
        return ERR_NOT_OPEN;
    }

    attendeeId = MESSAGE.author.id;
    attendeeName = MESSAGE.author.username;

    // check for duplicates
    for (var i = 0; i < contestData.attendees.length; i++) {
        if (contestData.attendees[i].id === attendeeId) {
            MESSAGE.channel.send("You've already joined this contest...");
            return ERR_ALREADY_JOINED;
        }
    }

    // prepare attendee data
    var attendeeData = {
        "id": attendeeId,
        "name": attendeeName,
        "entries": []
    }

    // write attendee data to contest file
    contestData.attendees.push(attendeeData);
    writeContestData(contestId, contestData);

    MESSAGE.channel.send("You're now competing in this contest!");
    console.info(attendeeName + ' (' + attendeeId + ') ' + "has joined contest '" + contestId + "'!");
}

function infoContest() {
    var contestId, contestData;
    
    contestId = ARGS[1];

    contestData = getContestData(contestId);
    if (contestData === ERR_CONTEST_NOT_FOUND) return;

    printContestSheet(contestId);

    // print all round sheets
    for (var i = 0; i < contestData.contest.currentRound; i++) {
        printRoundSheet(contestId, i + 1);
    }
}

function listContests() {
    const fs = require('fs');

    var filePath, contests;
    
    filePath = 'res/contests/';
    contests = fs.readdirSync(filePath);

    // check for no contests
    if (!contests.length) {
        MESSAGE.channel.send("There are no contests...");
        return ERR_NO_CONTESTS;
    }

    var contestId, contestData;

    var contestsString = "";
    for (var i = 0; i < contests.length; i++) {
        
        contestId = contests[i].substr(0, contests[i].indexOf('.'));
        contestData = getContestData(contestId);
        if (contestData === ERR_CONTEST_NOT_FOUND) return;


        // prepare contest string for this contest
        contestsString = contestsString + '• `';

        // display entry count (mode)
        if (contestData.contest.entryCount > 0) {
            contestsString = contestsString + '🏅 ';
        } else {
            contestsString = contestsString + '🎪 ';
        }

        // display contest state
        switch(contestData.contest.state) {
            case STAT_OPEN:
                contestsString = contestsString + '🟦 ';
                break;
            case STAT_STARTED:
                contestsString = contestsString + '🟩 ';
                break;
            case STAT_CLOSED:
                contestsString = contestsString + '🟥 ';
                break;
            default:
                contestsString = contestsString + '⬜ ';
                break;
        }

        contestsString = contestsString + contestId + " (Author: " + contestData.contest.authorName + ") - (Created: " + contestData.contest.creationDate.substr(0, 10) + ")`\n";
    }

    // show embed
    const embed = new MessageEmbed()
    .setTitle("📄 Contest List")
    .setDescription("🟦 Open (Can be joined)\n🟩 Started (Can't be joined)\n🟥 Closed (Archived)")
    .setColor("#6666ff")
    .setTimestamp();

    embed.addFields({
        name: "Contests",
        value: contestsString,
        inline: false
    });

    MESSAGE.channel.send({ embeds: [embed] });
}

function personalStats() {
    var contestId, contestData;
    
    contestId = ARGS[1];

    contestData = getContestData(contestId);
    if (contestData === ERR_CONTEST_NOT_FOUND) return;

    var isAttending = false;
    for (var i = 0; i < contestData.attendees.length; i++) {
        if (contestData.attendees[i].id === MESSAGE.author.id) {
            isAttending = true;

            // show embed
            const embed = new MessageEmbed()
            .setTitle("🤠 Personal Statistics")
            .setDescription("Logged for contest `" + contestId + '`')
            .setColor("#6666ff")
            .setTimestamp();

            // prepare entries
            var entriesString = "";
            for (var j = 0; j < contestData.attendees[i].entries.length; j++) {
                entriesString = entriesString + '`' + contestData.attendees[i].entries[j].id + ':` ';

                // entry values
                for (var k = 0; k < contestData.attendees[i].entries[j].values.length; k++) {
                    entriesString = entriesString + '`' + contestData.attendees[i].entries[j].values[k].value + 'x ' + contestData.attendees[i].entries[j].values[k].objective + '` ';
                }

                entriesString = entriesString + '\n';
            }

            if (entriesString) {
                embed.addFields({
                    name: "Entries",
                    value: entriesString,
                    inline: false
                });
            }

            // prepare statistics
            var objectiveStatistics = new Array(contestData.contest.objectives.length).fill(Number(0));
            for (var j = 0; j < contestData.attendees[i].entries.length; j++) {
                for (var k = 0; k < contestData.attendees[i].entries[j].values.length; k++) {
                    objectiveStatistics[k] = objectiveStatistics[k] + Number(contestData.attendees[i].entries[j].values[k].value);
                }
            }

            for (var j = 0; j < contestData.contest.objectives.length; j++) {
                if (objectiveStatistics != 0) {
                    embed.addFields({
                        name: contestData.contest.objectives[j].name,
                        value: objectiveStatistics[j].toString(),
                        inline: false
                    });
                }
            }

            MESSAGE.channel.send({ embeds: [embed] });
        }
    }

    // check for attendance
    if (!isAttending) {
        MESSAGE.channel.send("You're not attending this contest...");
        return ERR_NOT_ATTENDING;
    }
}

function stateContest(state) {
    var contestId, contestData;

    contestId = ARGS[1];
    contestData = getContestData(contestId);
    if (contestData === ERR_CONTEST_NOT_FOUND) return;

    // author check
    if (contestData.contest.authorId !== MESSAGE.author.id) {
        MESSAGE.channel.send("Only the contest author can change the state...");
        return ERR_ONLY_AUTHOR;
    }

    // check for state change
    if (contestData.contest.state === state) {
        MESSAGE.channel.send("Contest is already in this state...");
        return ERR_SAME_STATE;
    }

    // check if already closed
    if (contestData.contest.state === 'Closed') {
        MESSAGE.channel.send("What's dead should stay dead...");
        return ERR_DEAD_CONTEST;
    }

    contestData.contest.state = state;

    // write state to contest file
    writeContestData(contestId, contestData);

    switch (contestData.contest.state) {
        case 'Started':
            MESSAGE.channel.send("Contest has been started!");
            console.info("Contest '" + contestId + "' has been started!")
            printContestSheet(contestId);
            break;
        case 'Closed':
            MESSAGE.channel.send("Contest has been closed!");
            console.info("Contest '" + contestId + "' has been closed!")
            printContestSheet(contestId);
            break;
        default:
            break;
    }
}


function roundContest() {
    var contestId, contestData;

    contestId = ARGS[1];
    contestData = getContestData(contestId);
    if (contestData === ERR_CONTEST_NOT_FOUND) return;

    // author check
    if (contestData.contest.authorId !== MESSAGE.author.id) {
        MESSAGE.channel.send("Only the contest author can change the current round...");
        return ERR_ONLY_AUTHOR;
    }

    contestData.contest.currentRound++;

    // check if last round
    if (contestData.contest.currentRound > contestData.contest.maxRoundCount) {
        stateContest(STAT_CLOSED);
        return;
    }

    // write new round to contest file
    writeContestData(contestId, contestData);

    MESSAGE.channel.send("Round " + contestData.contest.currentRound + " has started!");
    console.info("Contest '" + contestId + "' has reached round " + contestData.contest.currentRound + "!");
    printContestSheet(contestId);
    printRoundSheet(contestId, contestData.contest.currentRound - 1);
}

function entryContest() {
    const crypto = require('crypto');

    var contestId, contestData;

    contestId = ARGS[1];
    contestData = getContestData(contestId);
    if (contestData === ERR_CONTEST_NOT_FOUND) return;

    // check, whether contest is in state started
    switch (contestData.contest.state) {
        case STAT_OPEN:
            MESSAGE.channel.send("Contest `" + contestId + "` hasn't started, yet...");
            return ERR_NOT_STARTED;
        case STAT_CLOSED:
            MESSAGE.channel.send("Contest `" + contestId + "` is already closed...");
            return ERR_DEAD_CONTEST;
        default:
            break;
    }

    // check for attendee
    var isAttending = false;
    for (var i = 0; i < contestData.attendees.length; i++) {
        if (contestData.attendees[i].id === MESSAGE.author.id) {
            isAttending = true;

            // check for too many entries
            if (contestData.contest.entryCount > 0) {
                if (contestData.attendees[i].entries.length >= contestData.contest.entryCount) {
                    MESSAGE.channel.send("You can't log more entries...");
                    return ERR_MAXIMUM_ENTRIES;
                }
            }

            // generate unique entry id
            var entryId, isDuplicate;

            entryId = crypto.randomBytes(5).toString("hex");
            isDuplicate = false;
            while (true) {
                isDuplicate = false;
                for (var j = 0; j < contestData.attendees[i].entries.length; j++) {
                    if (entryId === contestData.attendees[i].entries[j].id) {
                        isDuplicate = true;
                    }
                }

                if (!isDuplicate) {
                    break;
                }

                entryId = crypto.randomBytes(5).toString("hex");
            }

            // prepare entry data
            var objectiveId, objectiveValue;
            var entryValues = [];
            for (var j = 0; j < contestData.contest.objectives.length; j++) {

                // check, whether objective is in arguments and fill value
                for (var k = 2; k < ARGS.length; k++) {
                    objectiveId = parseInt(ARGS[k].substr(0, ARGS[k].indexOf('=')));

                    // check numeric
                    if (isNaN(objectiveId)) {
                        MESSAGE.channel.send("Objective ID `" + objectiveId + "` is not numeric...");
                        return ERR_NOT_NUMERIC;
                    }

                    if (objectiveId - 1 === j) {
                        objectiveValue = parseInt(ARGS[k].split('=')[1]);

                        // check numeric
                        if (isNaN(objectiveValue)) {
                            MESSAGE.channel.send("Enter a numeric value for objective ID`" + objectiveId + "`...");
                            return ERR_NOT_NUMERIC;
                        }

                        break;
                    } else {
                        objectiveValue = 0;
                    }
                }

                valueData = {
                    "objective": contestData.contest.objectives[j].name,
                    "value": objectiveValue
                }

                entryValues.push(valueData);
            }

            entryData = {
                "id": entryId,
                "round": contestData.contest.currentRound,
                "values": entryValues
            }
            
            contestData.attendees[i].entries.push(entryData);
        }
    }

    // check for attendance
    if (!isAttending) {
        MESSAGE.channel.send("You're not attending this contest...");
        return ERR_NOT_ATTENDING;
    }
    
    // write entry to contest file
    writeContestData(contestId, contestData);

    MESSAGE.channel.send("Your entry `" + entryId + "` has been logged!");
    console.info(MESSAGE.author.username + ' (' + MESSAGE.author.id + ') ' + "has logged an entry '" + entryId + "' in contest '" + contestId + "'!");

    isFinished = checkFinished(contestId);
    if (isFinished) {
        contestData.contest.state = STAT_CLOSED;

        writeContestData(contestId, contestData);

        MESSAGE.channel.send("Contest has been closed!");
        console.info("Contest '" + contestId + "' has been closed!")
        printContestSheet(contestId);
    }
}

function getContestData(contestId) {
    const fs = require('fs');

    var filePath, contestFile, contestData;

    filePath = 'res/contests/' + contestId + '.json';

    // check, whether contest exists
    if (!fs.existsSync(filePath)) {
        MESSAGE.channel.send("Contest `" + contestId + "` does not exist...");
        return ERR_CONTEST_NOT_FOUND;
    }

    // read contest data out of contest file
    contestFile = fs.readFileSync(filePath, 'utf-8');
    contestData;
    try {
        contestData = JSON.parse(contestFile);
    } catch (err) {
        console.error(err);
    }

    return contestData;
}

function writeContestData(contestId, contestData) {
    const fs = require('fs');

    var filePath;

    filePath = 'res/contests/' + contestId + '.json';

    // write attendee to contest file
    try {
        fs.writeFileSync(filePath, JSON.stringify(contestData, null, 4));
    } catch (err) {
        console.error(err);
    }
}

function printContestSheet(contestId) {
    var contestData;

    contestData = getContestData(contestId);
    if (contestData === ERR_CONTEST_NOT_FOUND) return;

    // create embed
    const embed = new MessageEmbed()
    .setDescription("")
    .setTimestamp();

    // display objectives example
    var objectivesStringExample = "";
    for (var i = 0; i < contestData.contest.objectives.length; i++) {
        objectivesStringExample = objectivesStringExample + ' ' + (i + 1) + '=' + "0";
    }

    // prepare rated symbol
    var ratedString = "";
    if (contestData.contest.rated === true) {
        ratedString = " • `⭐`";
    }

    // display contest state
    switch(contestData.contest.state) {
        case STAT_OPEN:
            embed.setTitle("Contest `[" + contestId + "]` • `[OPEN]`" + ratedString);
            embed.setDescription("`!cry contest join " + contestId + '`');
            embed.setColor("#00ccff");
            break;
        case STAT_STARTED:
            embed.setTitle("Contest `[" + contestId + "]` • `[STARTED]`" + ratedString);
            embed.setDescription("`!cry contest add " + contestId + objectivesStringExample + '`');
            embed.setColor("#99ff99");
            break;
        case STAT_CLOSED:
            embed.setTitle("Contest `[" + contestId + "]` • `[CLOSED]`" + ratedString);
            embed.setDescription("This contest is over");
            embed.setColor("#ff0000");
            break;
        default:
            embed.setTitle("Contest `[" + contestId + "]` • `[UNDEFINED]`" + ratedString);
            embed.setDescription("");
            embed.setColor("#ffffff");
            break;
    }

    // display entry count (mode)
    if (contestData.contest.entryCount > 0) {
        embed.addFields({
            name: "Tournament Mode 🏅",
            value: "Limited to " + contestData.contest.entryCount + " entries per attendee",
            inline: false
        });
    } else {
        embed.addFields({
            name: "Event Mode 🎪",
            value: "Unlimited entries per attendee",
            inline: false
        });
    }

    // display objectives
    var objectivesString = "";
    for (var i = 0; i < contestData.contest.objectives.length; i++) {
        objectivesString = objectivesString + '`[' + (i + 1) + ']` ' + contestData.contest.objectives[i].name + ' (' + contestData.contest.objectives[i].value + ' Points)\n';
    }

    embed.addFields({
        name: "Objectives 🎗️ ",
        value: objectivesString,
        inline: false
    });

    // displays attendees
    var attendeePoints, attendeePointsRounded;
    var attendees = [];
    for (var i = 0; i < contestData.attendees.length; i++) {

        // calculate points
        attendeePoints = calculatePoints(contestData.contest.id, contestData.attendees[i].id, 0);
        attendeePointsRounded = Math.round(attendeePoints * 100) / 100;

        var attendeeData = {
            "name": contestData.attendees[i].name,
            "points": attendeePointsRounded
        }
        attendees.push(attendeeData);
    }

    var sortedAttendees = sortAttendees(attendees);

    var podiumString = "";
    var place = 0;
    var position = 0;
    for (var i = 0; i < sortedAttendees.length; i++) {

        // check for points
        if (sortedAttendees[i].points <= 0) {
            continue;
        }

        // check for same medal
        if (i > 0) {
            position++;

            if (sortedAttendees[i - 1].points > sortedAttendees[i].points) {
                place = position;
            }

            // only display first, second and third
            if (place > 2) {
                break;
            }
        }

        // display medal
        switch (place) {
            case 0:
                podiumString = podiumString + '🥇 ';
                break;
            case 1:
                podiumString = podiumString + '🥈 ';
                break;
            case 2:
                podiumString = podiumString + '🥉 ';
                break;
            default:
                break;
        }

        podiumString = podiumString + sortedAttendees[i].name + ' (' + sortedAttendees[i].points + ' Points)\n';
    }

    if (podiumString !== "") {
        embed.addFields({
            name: "Podium 🔥",
            value: podiumString,
            inline: false
        });
    }

    var attendeesString = "";
    for (var i = 0; i < sortedAttendees.length; i++) {
        attendeesString = attendeesString + '• ' + sortedAttendees[i].name + ' (' + sortedAttendees[i].points + ' Points)\n';
    }

    if (attendeesString !== "") {
        embed.addFields({
            name: "Attendees 🤠",
            value: attendeesString,
            inline: false
        });
    }

    MESSAGE.channel.send({ embeds: [embed] });
}

function printRoundSheet(contestId, contestRound) {
    var contestData;

    contestData = getContestData(contestId);
    if (contestData === ERR_CONTEST_NOT_FOUND) return;

    // create embed
    const embed = new MessageEmbed()
    .setDescription("")
    .setTimestamp();

    // display contest round
    embed.setTitle("Round " + contestRound);
    embed.setDescription("");
    embed.setColor("#cc6699");

    // displays attendees
    var attendeePoints, attendeePointsRounded;
    var attendees = [];
    for (var i = 0; i < contestData.attendees.length; i++) {

        // calculate points
        attendeePoints = calculatePoints(contestData.contest.id, contestData.attendees[i].id, contestRound);
        attendeePointsRounded = Math.round(attendeePoints * 100) / 100;

        var attendeeData = {
            "name": contestData.attendees[i].name,
            "points": attendeePointsRounded
        }
        attendees.push(attendeeData);
    }

    var sortedAttendees = sortAttendees(attendees);

    var attendeesString = "";
    for (var i = 0; i < sortedAttendees.length; i++) {
        attendeesString = attendeesString + '• ' + sortedAttendees[i].name + ' (' + sortedAttendees[i].points + ' Points)\n';
    }

    if (attendeesString !== "") {
        embed.addFields({
            name: "Results 🎬",
            value: attendeesString,
            inline: false
        });
    }

    // prepare player statistics
    var playerStatisticsString = "";
    var objectiveStatistics;
    for (var i = 0; i < contestData.attendees.length; i++) {

        playerStatisticsString = playerStatisticsString + "• " + contestData.attendees[i].name + "\n";
        objectiveStatistics = new Array(contestData.contest.objectives.length).fill(Number(0));

        // go through all objectives
        for (var j = 0; j < contestData.contest.objectives.length; j++) {

            // go through all entries
            for (var k = 0; k < contestData.attendees[i].entries.length; k++) {

                // go through all values and add them to the objectives statistic
                for (var l = 0; l < contestData.attendees[i].entries[k].values.length; l++) {

                    if (contestData.attendees[i].entries[k].values[l].objective === contestData.contest.objectives[j].name) {
                        if (contestData.attendees[i].entries[k].round === contestRound) {
                            objectiveStatistics[j] = objectiveStatistics[j] + contestData.attendees[i].entries[k].values[l].value;
                        }
                    }
                }
            }

            // display objective values
            playerStatisticsString = playerStatisticsString + "`" + objectiveStatistics[j] + "x " + contestData.contest.objectives[j].name + "` ";
        }
        playerStatisticsString = playerStatisticsString + "\n";
    }

    embed.addFields({
        name: "Statistics 📈",
        value: playerStatisticsString,
        inline: false
    });

    MESSAGE.channel.send({ embeds: [embed] });
}

function calculatePoints(contestId, attendeeId, contestRound) {
    var contestData = getContestData(contestId);
    if (contestData === ERR_CONTEST_NOT_FOUND) return;

    // search for attendee
    var points = 0;
    for (var i = 0; i < contestData.attendees.length; i++) {
        if (contestData.attendees[i].id === attendeeId) {

            // calculate points for every entry
            for (var j = 0; j < contestData.attendees[i].entries.length; j++) {

                // check for round
                if (contestRound > 0 && contestData.attendees[i].entries[j].round !== contestRound) {
                    continue;
                }

                // multiply points by value of objective
                for (var k = 0; k < contestData.attendees[i].entries[j].values.length; k++) {
                    points = points + (contestData.attendees[i].entries[j].values[k].value * contestData.contest.objectives[k].value);
                }
            }
        }
    }
    return points;
}

function sortAttendees(attendees) {
    var sortedAttendees = attendees.sort((a, b) => {
        if (a.points < b.points) {
            return 1
        }
        if (a.points > b.points) {
            return -1
        }
        return 0
    });

    return sortedAttendees;
}

function checkFinished(contestId) {
    var contestData = getContestData(contestId);
    if (contestData === ERR_CONTEST_NOT_FOUND) return;

    // no auto-finish in event mode
    if (contestData.contest.entryCount == 0) {
        return false;
    }

    var isFinished = true;
    for (var i = 0; i < contestData.attendees.length; i++) {
        if (contestData.attendees[i].entries.length < contestData.contest.entryCount) {
            isFinished = false;
        }
    }

    return isFinished;
}