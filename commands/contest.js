const { MessageEmbed } = require("discord.js");
const { version } = require("os");
const config = require("../config.json");
require('better-logging')(console);

var MESSAGE, ARGS;

// database
const DB_PATH = 'res/chary.sqlite';
var SQL, DATABASE_DATA, RECORDS, MODTIME;

// contest states
const STAT_OPEN = 'Open';
const STAT_STARTED = 'Started';
const STAT_CLOSED = 'Closed';

// leaderboard fix lengths
const MAXIMUM_NAME_LENGTH = 13;
const MAXIMUM_NUMBER_LENGTH = 5;

// error codes
const ERR_CONTEST_NOT_FOUND = 1;
const ERR_OBJECTIVE_MINIMUM = 2;
const ERR_ALREADY_JOINED = 3;
const ERR_NO_CONTESTS = 4;
const ERR_ONLY_AUTHOR = 5;
const ERR_SAME_STATE = 6;
const ERR_DEAD_CONTEST = 7;
const ERR_NOT_STARTED = 8;
const ERR_MAXIMUM_ENTRIES = 9;
const ERR_NOT_NUMERIC = 10;
const ERR_NOT_ATTENDING = 11;
const ERR_NOT_OPEN = 12;
const ERR_ENTRY_NOT_FOUND = 13;
const ERR_TEAM_SIZE = 14;
const ERR_NO_STATS = 15;
const ERR_NO_OPTION = 16;
const ERR_RATED = 17;

module.exports = {
    name: 'contest',
    description: "Contest Manager!",
    execute(message, args) {

        MESSAGE = message;
        ARGS = args;

        init();

        switch(ARGS[0]) {
            // functions
            case "c":
            case "create":
                createContest();
                break;
            case "d":
            case "delete":
                deleteContest();
                break;
            case "o":
            case "options":
                optionsContest();
                break;
            case "j":
            case "join":
                joinContest();
                break;
            case "leave":
                leaveContest();
                break;
            case "a":
            case "add":
                entryContest();
                break;
            case "u":
            case "update":
                updateEntry();
                break;
            case "t":
            case "team":
                teamContest();
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
            
            case "b":
            case "board":
                boardContest();
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

            // developer
            case "refresh":
                if (config.developers.includes(MESSAGE.author.id)) refreshStatistics(ARGS[1]);
                break;
        }
    }
}

function createContest() {
    const crypto = require('crypto');

    // generate unique contest id
    var contestId = crypto.randomBytes(3).toString("hex");

    var contests;
    while (true) {

        // query contests
        SQL = "SELECT contestId FROM contests WHERE contestId = ?";
        DATABASE_DATA = [contestId];
        RECORDS = queryDatabase(SQL, DATABASE_DATA);

        contests = RECORDS;

        // check existing contest
        if (!contests.length) {
            break;
        }

        contestId = crypto.randomBytes(3).toString("hex");
    }

    // fill basic fields
    var contestCreationDate = new Date().toJSON();

    var contestState = STAT_OPEN;
    var contestAuthorId = MESSAGE.author.id;
    var contestAuthorName = MESSAGE.author.username;
    var contestCurrentRound = 1;
    var contestEntryCount = 0;
    var contestMaxRoundCount = 0;
    var contestRated = 0;
    var contestType = "";

    // check for objectives
    if (ARGS.length < 2) {
        MESSAGE.channel.send("Enter at least one objective...");
        return ERR_OBJECTIVE_MINIMUM;
    }

    // fill contest objectives
    var contestObjectives = [];
    var objectiveName, objectiveValue;

    for (var i = 1; i < ARGS.length; i++) {
        objectiveName = ARGS[i].substr(0, ARGS[i].indexOf('='));
        objectiveValue = parseFloat(ARGS[i].split('=')[1]);

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

    // prepare contest data for table "contests_objectives"
    for (var i = 0; i < contestObjectives.length; i++) {
        MODTIME = getModtime();

        SQL = `INSERT INTO contest_objectives(
            contestId,
            name,
            value,
            modtime
            ) VALUES (?, ?, ?, ?)`;

        DATABASE_DATA = [
            contestId,
            contestObjectives[i].name,
            contestObjectives[i].value,
            MODTIME
        ];

        writeDatabase(SQL, DATABASE_DATA);
    }

    // prepare contest data for table "contests"
    MODTIME = getModtime();

    SQL = `INSERT INTO contests(
        contestId,
        creationDate,
        state,
        authorId,
        authorName,
        entryCount,
        currentRound,
        maxRoundCount,
        rated,
        type,
        modtime
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    DATABASE_DATA = [
        contestId,
        contestCreationDate,
        contestState,
        contestAuthorId,
        contestAuthorName,
        contestEntryCount,
        contestCurrentRound,
        contestMaxRoundCount,
        contestRated,
        contestType,
        MODTIME];

    writeDatabase(SQL, DATABASE_DATA);

    MESSAGE.channel.send("Contest `" + contestId + "` created!");
    console.info(contestAuthorName + ' (' + contestAuthorId + ') ' + "has created contest '" + contestId + "'!");

    printContestSheet(contestId);
}

function deleteContest() {
    var contestId = ARGS[1];

    // query contests
    SQL = "SELECT contestId, authorId FROM contests WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contests = RECORDS;

    // check existing contest
    if (!contests.length) {
        MESSAGE.channel.send("Contest `" + contestId + "` does not exist...");
        return ERR_CONTEST_NOT_FOUND;
    }

    // check developer
    if (!config.developers.includes(MESSAGE.author.id)) {

        // check author
        if (contests[0].authorId !== MESSAGE.author.id) {
            MESSAGE.channel.send("Only the contest author can delete the contest...");
            return ERR_ONLY_AUTHOR;
        }
    }

    // truncate contests table
    SQL = "DELETE FROM contests WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    writeDatabase(SQL, DATABASE_DATA);

    // truncate contest_objectives table
    SQL = "DELETE FROM contest_objectives WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    writeDatabase(SQL, DATABASE_DATA);

    // truncate contest_attendees table
    SQL = "DELETE FROM contest_attendees WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    writeDatabase(SQL, DATABASE_DATA);

    // truncate contest_attendee_entries table
    SQL = "DELETE FROM contest_attendee_entries WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    writeDatabase(SQL, DATABASE_DATA);

    // truncate contest_attendee_teams table
    SQL = "DELETE FROM contest_attendee_teams WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    writeDatabase(SQL, DATABASE_DATA);

    // truncate contest_attendee_statistics table
    SQL = "DELETE FROM contest_attendee_statistics WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    writeDatabase(SQL, DATABASE_DATA);

    // truncate contest_attendee_objective_statistics table
    SQL = "DELETE FROM contest_attendee_objective_statistics WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    writeDatabase(SQL, DATABASE_DATA);

    MESSAGE.channel.send("Contest `" + contestId + "` has been deleted!");
    console.info(MESSAGE.author.username + ' (' + MESSAGE.author.id + ') ' + "has deleted contest '" + contestId + "'!");
}

function optionsContest() {
    var contestId = ARGS[1];

    // query contests
    SQL = "SELECT authorId, state FROM contests WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contests = RECORDS;

    // check existing contest
    if (!contests.length) {
        MESSAGE.channel.send("Contest `" + contestId + "` does not exist...");
        return ERR_CONTEST_NOT_FOUND;
    }

    // check developer
    if (!config.developers.includes(MESSAGE.author.id)) {

        // check author
        if (contests[0].authorId !== MESSAGE.author.id) {
            MESSAGE.channel.send("Only the contest author can change the contest options...");
            return ERR_ONLY_AUTHOR;
        }

        // only changeable, when in open state
        if (contests[0].state !== STAT_OPEN) {
            MESSAGE.channel.send("Contest isn't open anymore...");
            return ERR_NOT_OPEN;
        }
    }

    // check options
    if (ARGS.length < 3) {
        MESSAGE.channel.send("Enter at least one option...");
        return ERR_NO_OPTION;
    }

    // change options
    var argName, argValue, argSubValue;
    for (var i = 2; i < ARGS.length; i++) {
        argName = ARGS[i].substr(0, ARGS[i].indexOf('='));
        argValue = ARGS[i].split('=')[1];
        argSubValue = ARGS[i].split('=')[2];

        switch (argName) {
            case "-ec":
            case "--entry-count":
                if (isNaN(argValue)) {
                    MESSAGE.channel.send("Enter a numeric value for the entry count..." );
                    return ERR_NOT_NUMERIC;
                }

                // prepare contest data for table "contests"
                MODTIME = getModtime();
                SQL = "UPDATE contests SET entryCount = ?, modtime = ? WHERE contestId = ?";
                DATABASE_DATA = [argValue, MODTIME, contestId];
                writeDatabase(SQL, DATABASE_DATA);
                break;
            case "-rc":
            case "--round-count":
                if (isNaN(argValue)) {
                    MESSAGE.channel.send("Enter a numeric value for the maximum round count..." );
                    return ERR_NOT_NUMERIC;
                }
                
                // prepare contest data for table "contests"
                MODTIME = getModtime();
                SQL = "UPDATE contests SET maxRoundCount = ?, modtime = ? WHERE contestId = ?";
                DATABASE_DATA = [argValue, MODTIME, contestId];
                writeDatabase(SQL, DATABASE_DATA);
                break;
            case "-rf":
            case "--rated-flag":

                // check options
                if (argValue !== "true" && argValue !== "false") {
                    MESSAGE.channel.send("Enter `true` / `false` for the rated flag..." );
                    return ERR_RATED;
                }

                if (argValue === "true") {
                    argValue = 1;
                } else {
                    argValue = 0;
                }

                // prepare contest data for table "contests"
                MODTIME = getModtime();
                SQL = "UPDATE contests SET rated = ?, modtime = ? WHERE contestId = ?";
                DATABASE_DATA = [argValue, MODTIME, contestId];
                writeDatabase(SQL, DATABASE_DATA);
                break;
            case "-ao":
            case "--add-objective":
                if (isNaN(argSubValue)) {
                    MESSAGE.channel.send("Enter a numeric value for objective `" + argValue + "`..." );
                    return ERR_NOT_NUMERIC;
                }

                // query objectives
                SQL = "SELECT name FROM contest_objectives WHERE contestId = ? AND name = ?";
                DATABASE_DATA = [contestId, argValue];
                RECORDS = queryDatabase(SQL, DATABASE_DATA);

                var contestObjectives = RECORDS;

                // prepare contest data for table "contest_objectives"
                MODTIME = getModtime();

                // check existing objective
                if (!contestObjectives.length) {
                    SQL = "INSERT INTO contest_objectives(contestId, name, value, modtime) VALUES (?, ?, ?, ?)";
                    DATABASE_DATA = [contestId, argValue, argSubValue, MODTIME];
                } else {
                    SQL = "UPDATE contest_objectives SET value = ?, modtime = ? WHERE contestId = ? AND name = ?";
                    DATABASE_DATA = [argSubValue, MODTIME, contestId, argValue];
                }
                writeDatabase(SQL, DATABASE_DATA);
                break;
            case "-ro":
            case "--remove-objective":

                // query objectives
                SQL = "SELECT name FROM contest_objectives WHERE contestId = ?";
                DATABASE_DATA = [contestId];
                RECORDS = queryDatabase(SQL, DATABASE_DATA);

                var contestObjectives = RECORDS;

                if (contestObjectives.length < 2) {
                    MESSAGE.channel.send("Can't delete more objectives...");
                    return ERR_OBJECTIVE_MINIMUM;
                }

                // delete contest objective
                SQL = "DELETE FROM contest_objectives WHERE contestId = ? AND name = ?";
                DATABASE_DATA = [contestId, argValue];
                writeDatabase(SQL, DATABASE_DATA);
                break;
            case "-ty":
            case "--type":

                // prepare contest data for table "contests"
                MODTIME = getModtime();
                SQL = "UPDATE contests SET type = ?, modtime = ? WHERE contestId = ?";
                DATABASE_DATA = [argValue, MODTIME, contestId];
                writeDatabase(SQL, DATABASE_DATA);
                break;
            default:
                break;
        }
    }
    
    MESSAGE.channel.send("Options for contest `" + contestId + "` changed!");
    console.info(MESSAGE.author.username + ' (' + MESSAGE.author.id + ') ' + "has changed options for contest '" + contestId + "'!");

    printContestSheet(contestId);
}

function joinContest() {
    var contestId = ARGS[1];

    // query contests
    SQL = "SELECT contestId, state FROM contests WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contests = RECORDS;

    // check existing contest
    if (!contests.length) {
        MESSAGE.channel.send("Contest `" + contestId + "` does not exist...");
        return ERR_CONTEST_NOT_FOUND;
    }

    // only joinable, when in open state
    if (contests[0].state !== STAT_OPEN) {
        MESSAGE.channel.send("Contest can't be joined anymore...");
        return ERR_NOT_OPEN;
    }

    var attendeeId = MESSAGE.author.id;
    var attendeeName = MESSAGE.author.username;

    // query attendees
    SQL = "SELECT attendeeId FROM contest_attendees WHERE contestId = ? AND attendeeId = ?";
    DATABASE_DATA = [contestId, attendeeId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestAttendees = RECORDS;

    // check for duplicates
    if (contestAttendees.length) {
        MESSAGE.channel.send("You've already joined this contest...");
        return ERR_ALREADY_JOINED;
    }

    // prepare contest data for table "contest_attendees"
    MODTIME = getModtime();

    SQL = `INSERT INTO contest_attendees(
        contestId,
        attendeeId,
        name,
        modtime
        ) VALUES (?, ?, ?, ?)`;

    DATABASE_DATA = [
        contestId,
        attendeeId,
        attendeeName,
        MODTIME];

    writeDatabase(SQL, DATABASE_DATA);

    MESSAGE.channel.send("You're now competing in contest `" + contestId + "`!");
    console.info(attendeeName + ' (' + attendeeId + ') ' + "has joined contest '" + contestId + "'!");
}

function leaveContest() {
    var contestId = ARGS[1];

    // query contests
    SQL = "SELECT contestId, state FROM contests WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contests = RECORDS;

    // check existing contest
    if (!contests.length) {
        MESSAGE.channel.send("Contest `" + contestId + "` does not exist...");
        return ERR_CONTEST_NOT_FOUND;
    }

    // check developer
    if (!config.developers.includes(MESSAGE.author.id)) {
        
        // only leavable, when in open state
        if (contests[0].state !== STAT_OPEN) {
            MESSAGE.channel.send("Contest has already started/ended...");
            return ERR_NOT_OPEN;
        }
    }

    var attendeeId = MESSAGE.author.id;
    var attendeeName = MESSAGE.author.username;

    // query attendees
    SQL = "SELECT attendeeId FROM contest_attendees WHERE contestId = ? AND attendeeId = ?";
    DATABASE_DATA = [contestId, attendeeId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestAttendees = RECORDS;

    // check for attendence
    if (!contestAttendees.length) {
        MESSAGE.channel.send("You haven't joined this contest...");
        return ERR_ALREADY_JOINED;
    }

    // truncate contest_attendees table
    SQL = "DELETE FROM contest_attendees WHERE contestId = ? AND attendeeId = ?";
    DATABASE_DATA = [contestId, attendeeId];
    writeDatabase(SQL, DATABASE_DATA);

    MESSAGE.channel.send("You've left contest `" + contestId + "`!");
    console.info(attendeeName + ' (' + attendeeId + ') ' + "has left contest '" + contestId + "'!");
}

function infoContest() {
    var contestId = ARGS[1];

    // query contests
    SQL = "SELECT contestId, currentRound FROM contests WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contests = RECORDS;

    // check existing contest
    if (!contests.length) {
        MESSAGE.channel.send("Contest `" + contestId + "` does not exist...");
        return ERR_CONTEST_NOT_FOUND;
    }

    // print all round sheets
    for (var i = 0; i < contests[0].currentRound; i++) {
        printRoundSheet(contestId, i + 1);
    }

    printContestSheet(contestId);
}

function listContests() {
    // query contests
    SQL = "SELECT contestId, entryCount, state, authorName, creationDate, type FROM contests";
    DATABASE_DATA = [];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contests = RECORDS;

    // check for no contests
    if (!contests.length) {
        MESSAGE.channel.send("There are no contests...");
        return ERR_NO_CONTESTS;
    }

    // list contests
    var contestsString = "";
    for(var i = 0; i < contests.length; i++) {

        // prepare contest string for this contest
        contestsString = contestsString + '• `';

        // display contest state
        switch(contests[i].state) {
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

        contestsString = contestsString + contests[i].contestId + " (" + contests[i].creationDate.substr(0, 10) + ") - (" + contests[i].authorName + ")";
        
        if (contests[i].type) {
            contestsString = contestsString + " - (" + contests[i].type + ")`\n";
        } else {
            contestsString = contestsString + "`\n"
        }
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
    var attendeeId = MESSAGE.author.id;

    // create embed
    const embed = new MessageEmbed()
    .setDescription("")
    .setTimestamp();

    // display contest round
    embed.setTitle("🤠 Personal Statistics");
    embed.setDescription("");
    embed.setColor("#32a852");

    // personal statistics options
    var argName, argValue;
    var argumentContestId, argumentType;
    for (var i = 1; i < ARGS.length; i++) {
        argName = ARGS[i].substr(0, ARGS[i].indexOf('='));
        argValue = ARGS[i].split('=')[1];

        switch (argName) {
            case "-id":
            case "--contest-id":
                argumentContestId = argValue;
                break;
            case "-ty":
            case "--type":
                argumentType = argValue;
                break;
            default:
                break;
        }
    }

    // query general statistics
    if (argumentType) {
        SQL = `SELECT a.contestId, a.points, a.place
            FROM contest_attendee_statistics AS a
            INNER JOIN contests AS b
            ON a.contestId = b.contestId
            WHERE a.attendeeId = ? AND a.round = ? AND b.type = ?
            ORDER BY place`;
        DATABASE_DATA = [attendeeId, 0, argumentType];
    } else if (argumentContestId) {
        SQL = "SELECT contestId, points, place FROM contest_attendee_statistics WHERE attendeeId = ? AND round = ? AND contestId = ? ORDER BY place";
        DATABASE_DATA = [attendeeId, 0, argumentContestId];
    } else {
        SQL = "SELECT contestId, points, place FROM contest_attendee_statistics WHERE attendeeId = ? AND round = ? ORDER BY place";
        DATABASE_DATA = [attendeeId, 0];
    }
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestAttendeeStatistics = RECORDS;

    // check for statistics
    if (!contestAttendeeStatistics.length) {
        MESSAGE.channel.send("There are no statistics logged for you, yet...");
        return ERR_NO_STATS;
    }

    // display contests
    if (!argumentContestId) {
        var contestsString = "";

        for (var i = 0; i < contestAttendeeStatistics.length; i++) {
            
            switch (contestAttendeeStatistics[i].place) {
                case 1:
                    contestsString = contestsString + '🥇 ' + contestAttendeeStatistics[i].contestId + " (" + contestAttendeeStatistics[i].place + ")\n";
                    break;
                case 2:
                    contestsString = contestsString + '🥈 ' + contestAttendeeStatistics[i].contestId + " (" + contestAttendeeStatistics[i].place + ")\n";
                    break;
                case 3:
                    contestsString = contestsString + '🥉 ' + contestAttendeeStatistics[i].contestId + " (" + contestAttendeeStatistics[i].place + ")\n";
                    break;
                default:
                    contestsString = contestsString + '🎗️ ' + contestAttendeeStatistics[i].contestId + " (" + contestAttendeeStatistics[i].place + ")\n";
                    break;
            }
        }
        
        if (contestsString !== "") {
            embed.addFields({
                name: "Contests (" + contestAttendeeStatistics.length + ") 🏅",
                value: '```' + contestsString + '```',
                inline: false
            });
        }
    }

    // display performance
    if (!argumentContestId) {
        var performanceString = "Statistic".padEnd(15) + "Total".padStart(10) + "Average".padStart(10) + "Best".padStart(10) + "\n" + "".padEnd(45, "-") + "\n";

        if (argumentType) {
            SQL = `SELECT sum(points) AS sumContestPoints, avg(points) AS avgContestPoints, max(points) AS maxContestPoints
                FROM contest_attendee_statistics AS a
                INNER JOIN contests AS b
                ON a.contestId = b.contestId
                WHERE a.attendeeId = ? AND a.round = ? AND b.type = ?`;
            DATABASE_DATA = [attendeeId, 0, argumentType];
        } else {
            SQL = `SELECT sum(points) AS sumContestPoints, avg(points) AS avgContestPoints, max(points) AS maxContestPoints
                FROM contest_attendee_statistics
                WHERE attendeeId = ? AND round = ?`;
            DATABASE_DATA = [attendeeId, 0];
        }
        RECORDS = queryDatabase(SQL, DATABASE_DATA);

        var contestAttendeeStatisticsCP = RECORDS;

        performanceString = performanceString + "Points".padEnd(15) 
                          + contestAttendeeStatisticsCP[0].sumContestPoints.toString().padStart (10)
                          + (Math.round(contestAttendeeStatisticsCP[0].avgContestPoints * 100) / 100).toString().padStart (10)
                          + contestAttendeeStatisticsCP[0].maxContestPoints.toString().padStart (10) + "\n";

        if (performanceString !== "") {
            embed.addFields({
                name: "Performance 🏹",
                value: '```' + performanceString + '```',
                inline: false
            });
        }
    }

    // display objectives
    var objectivesString = "Objective".padEnd(15) + "Total".padStart(10) + "Average".padStart(10) + "Best".padStart(10) + "\n" + "".padEnd(45, "-") + "\n";

    // query objectives
    if (argumentType) {
        SQL = `SELECT objectiveName, sum(objectiveValue) AS sumObjectiveValue, avg(objectiveValue) AS avgObjectiveValue, max(objectiveValue) AS maxObjectiveValue
            FROM contest_attendee_objective_statistics AS a
            INNER JOIN contests AS b
            ON a.contestId = b.contestId
            WHERE a.attendeeId = ? AND a.round = ? AND b.type = ?
            GROUP BY objectiveName`;
        DATABASE_DATA = [attendeeId, 0, argumentType];
    } else if (argumentContestId) {
        SQL = `SELECT objectiveName, sum(objectiveValue) AS sumObjectiveValue, avg(objectiveValue) AS avgObjectiveValue, max(objectiveValue) AS maxObjectiveValue
            FROM contest_attendee_objective_statistics
            WHERE attendeeId = ? AND round = ? AND contestId = ?
            GROUP BY objectiveName`;
        DATABASE_DATA = [attendeeId, 0, argumentContestId];
    } else {
        SQL = `SELECT objectiveName, sum(objectiveValue) AS sumObjectiveValue, avg(objectiveValue) AS avgObjectiveValue, max(objectiveValue) AS maxObjectiveValue
            FROM contest_attendee_objective_statistics
            WHERE attendeeId = ? AND round = ?
            GROUP BY objectiveName`;
        DATABASE_DATA = [attendeeId, 0];
    }
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var objectiveStatisticsDistinct = queryDatabase(SQL, DATABASE_DATA);
    
    for (var i = 0; i < objectiveStatisticsDistinct.length; i++) {
        objectivesString = objectivesString + objectiveStatisticsDistinct[i].objectiveName.padEnd(15) 
                         + objectiveStatisticsDistinct[i].sumObjectiveValue.toString().padStart (10)
                         + (Math.round(objectiveStatisticsDistinct[i].avgObjectiveValue * 100) / 100).toString().padStart (10)
                         + objectiveStatisticsDistinct[i].maxObjectiveValue.toString().padStart (10) + "\n";
    }

    if (objectivesString !== "") {
        embed.addFields({
            name: "Objectives 🎗️",
            value: '```' + objectivesString + '```',
            inline: false
        });
    }

    MESSAGE.channel.send({ embeds: [embed] });
}

function boardContest() {
    // create embed
    const embed = new MessageEmbed()
    .setDescription("")
    .setTimestamp();

    embed.setTitle("🏆 Leaderboard");
    embed.setDescription("");
    embed.setColor("#eba434");

    // board options
    var argName, argValue, argumentType;
    for (var i = 1; i < ARGS.length; i++) {

        argName = ARGS[i].substr(0, ARGS[i].indexOf('='));
        argValue = ARGS[i].split('=')[1];

        switch (argName) {
            case "-ty":
            case "--type":
                argumentType = argValue;
                break;
            default:
                break;
        }
    }

    // set description according to contest type
    if (argumentType) {
        embed.setDescription("**" + argumentType + "**");
    }

    // query general statistics
    if (argumentType) {
        SQL = `SELECT DISTINCT a.attendeeId
            FROM contest_attendee_statistics AS a
            INNER JOIN contests AS b
            ON a.contestId = b.contestId
            WHERE b.type = ?`;
        DATABASE_DATA = [argumentType];
    } else {
        SQL = `SELECT DISTINCT attendeeId
            FROM contest_attendee_statistics`;
        DATABASE_DATA = [];
    }
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestAttendeeStatisticsDistinct = RECORDS;

    // check for statistics
    if (!contestAttendeeStatisticsDistinct.length) {
        MESSAGE.channel.send("There are no statistics logged, yet...");
        return ERR_NO_STATS;
    }

    // prepare attendees
    var attendees = [];
    var attendeePoints;
    for (var i = 0; i < contestAttendeeStatisticsDistinct.length; i++) {
        attendeePoints = 0;

        // query general statistics
        if (argumentType) {
            SQL = `SELECT a.contestId, a.place
                FROM contest_attendee_statistics AS a
                INNER JOIN contests AS b
                ON a.contestId = b.contestId
                WHERE a.attendeeId = ? AND a.round = ? AND b.type = ?`;
            DATABASE_DATA = [contestAttendeeStatisticsDistinct[i].attendeeId, 0, argumentType];
        } else {
            SQL = `SELECT contestId, place
                FROM contest_attendee_statistics
                WHERE attendeeId = ? AND round = ?`;
            DATABASE_DATA = [contestAttendeeStatisticsDistinct[i].attendeeId, 0];
        }
        RECORDS = queryDatabase(SQL, DATABASE_DATA);

        var contestAttendeeStatistics = RECORDS;

        // calculate overall place
        for (var j = 0; j < contestAttendeeStatistics.length; j++) {

            switch (contestAttendeeStatistics[j].place) {
                case 1:
                    attendeePoints = attendeePoints + 3;
                    break;
                case 2:
                    attendeePoints = attendeePoints + 2;
                    break;
                case 3:
                    attendeePoints = attendeePoints + 1;
                    break;
                default:
                    break;
            }
        }

        var attendeeData = {
            "id": contestAttendeeStatisticsDistinct[i].attendeeId,
            "points": attendeePoints
        }

        attendees.push(attendeeData);
    }

    // sort attendees
    var sortedAttendees = sortAttendees(attendees);

    // display medals
    var medalsString = "";
    for (var i = 0; i < sortedAttendees.length; i++) {

        // query attendees
        SQL = "SELECT name FROM contest_attendees WHERE attendeeId = ? ORDER BY modtime DESC";
        DATABASE_DATA = [sortedAttendees[i].id];
        RECORDS = queryDatabase(SQL, DATABASE_DATA);

        var contestAttendees = RECORDS;

        medalsString = medalsString + contestAttendees[0].name.padEnd(20);

        // query general statistics
        if (argumentType) {
            SQL = `SELECT a.contestId, a.place
                FROM contest_attendee_statistics AS a
                INNER JOIN contests AS b
                ON a.contestId = b.contestId
                WHERE a.attendeeId = ? AND a.round = ? AND b.type = ?
                ORDER BY a.place`;
            DATABASE_DATA = [sortedAttendees[i].id, 0, argumentType];
        } else {
            SQL = `SELECT contestId, place
                FROM contest_attendee_statistics
                WHERE attendeeId = ? AND round = ?
                ORDER BY place`;
            DATABASE_DATA = [sortedAttendees[i].id, 0];
        }
        RECORDS = queryDatabase(SQL, DATABASE_DATA);

        var contestAttendeeStatistics = RECORDS;

        // display medals
        for (var j = 0; j < contestAttendeeStatistics.length; j++) {

            switch (contestAttendeeStatistics[j].place) {
                case 1:
                    medalsString = medalsString + '🥇';
                    break;
                case 2:
                    medalsString = medalsString + '🥈';
                    break;
                case 3:
                    medalsString = medalsString + '🥉';
                    break;
                default:
                    break;
            }
        }

        medalsString = medalsString + "\n";
    }
    
    if (medalsString !== "") {
        embed.addFields({
            name: "Medals 🏅",
            value: '```' + medalsString + '```',
            inline: false
        });
    }

    // display points
    var pointsString = "Total".padEnd(20) + "Average".padEnd(20) + "Best".padEnd(20) + "\n" + "".padEnd(59, "-") + "\n";

    // total contest points
    if (argumentType) {
        SQL = `SELECT a.attendeeId, sum(points) AS sumContestPoints
            FROM contest_attendee_statistics AS a
            INNER JOIN contests AS b
            ON a.contestId = b.contestId
            WHERE a.round = ? AND b.type = ?
            GROUP BY a.attendeeId
            ORDER BY sumContestPoints DESC`;
        DATABASE_DATA = [0, argumentType];
    } else {
        SQL = `SELECT attendeeId, sum(points) AS sumContestPoints
            FROM contest_attendee_statistics
            WHERE round = ?
            GROUP BY attendeeId
            ORDER BY sumContestPoints DESC`;
        DATABASE_DATA = [0];
    }
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestAttendeeStatisticsSCP = RECORDS;

    // average contest points
    if (argumentType) {
        SQL = `SELECT a.attendeeId, avg(points) AS avgContestPoints
            FROM contest_attendee_statistics AS a
            INNER JOIN contests AS b
            ON a.contestId = b.contestId
            WHERE a.round = ? AND b.type = ?
            GROUP BY a.attendeeId
            ORDER BY avgContestPoints DESC`;
        DATABASE_DATA = [0, argumentType];
    } else {
        SQL = `SELECT attendeeId, avg(points) AS avgContestPoints
            FROM contest_attendee_statistics
            WHERE round = ?
            GROUP BY attendeeId
            ORDER BY avgContestPoints DESC`;
        DATABASE_DATA = [0];
    }
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestAttendeeStatisticsACP = RECORDS;

    // best contest points
    if (argumentType) {
        SQL = `SELECT a.attendeeId, max(points) AS maxContestPoints
            FROM contest_attendee_statistics AS a
            INNER JOIN contests AS b
            ON a.contestId = b.contestId
            WHERE a.round = ? AND b.type = ?
            GROUP BY a.attendeeId
            ORDER BY maxContestPoints DESC`;
        DATABASE_DATA = [0, argumentType];
    } else {
        SQL = `SELECT attendeeId, max(points) AS maxContestPoints
            FROM contest_attendee_statistics
            WHERE round = ?
            GROUP BY attendeeId
            ORDER BY maxContestPoints DESC`;
        DATABASE_DATA = [0];
    }
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestAttendeeStatisticsMCP = RECORDS;

    var displayName, contestAttendees, sumContestPointsRounded, avgContestPointsRounded, maxContestPointsRounded;
    for (var i = 0; i < 3; i++) {

        // total points
        SQL = "SELECT name FROM contest_attendees WHERE attendeeId = ? ORDER BY modtime DESC";
        DATABASE_DATA = [contestAttendeeStatisticsSCP[i].attendeeId];
        RECORDS = queryDatabase(SQL, DATABASE_DATA);

        contestAttendees = RECORDS;

        displayName = shortenName(contestAttendees[i].name);

        sumContestPointsRounded = Math.round(contestAttendeeStatisticsSCP[i].sumContestPoints * 100) / 100;

        pointsString = pointsString + displayName.padEnd(MAXIMUM_NAME_LENGTH + 1) + sumContestPointsRounded.toString().padStart(MAXIMUM_NUMBER_LENGTH) + " ";

        // average points
        SQL = "SELECT name FROM contest_attendees WHERE attendeeId = ? ORDER BY modtime DESC";
        DATABASE_DATA = [contestAttendeeStatisticsACP[i].attendeeId];
        RECORDS = queryDatabase(SQL, DATABASE_DATA);

        contestAttendees = RECORDS;

        displayName = shortenName(contestAttendees[i].name);

        avgContestPointsRounded = Math.round(contestAttendeeStatisticsACP[i].avgContestPoints * 100) / 100;

        pointsString = pointsString + displayName.padEnd(MAXIMUM_NAME_LENGTH + 1) + avgContestPointsRounded.toString().padStart(MAXIMUM_NUMBER_LENGTH) + " ";

        // best points
        SQL = "SELECT name FROM contest_attendees WHERE attendeeId = ? ORDER BY modtime DESC";
        DATABASE_DATA = [contestAttendeeStatisticsMCP[i].attendeeId];
        RECORDS = queryDatabase(SQL, DATABASE_DATA);

        contestAttendees = RECORDS;

        displayName = shortenName(contestAttendees[i].name);

        maxContestPointsRounded = Math.round(contestAttendeeStatisticsMCP[i].maxContestPoints * 100) / 100;

        pointsString = pointsString + displayName.padEnd(MAXIMUM_NAME_LENGTH + 1) + maxContestPointsRounded.toString().padStart(MAXIMUM_NUMBER_LENGTH) + " ";

        pointsString = pointsString + "\n";
    }

    pointsString = pointsString + "\n"
    
    if (pointsString !== "") {
        embed.addFields({
            name: "Points 😎",
            value: '```' + pointsString + '```',
            inline: false
        });
    }
    
    MESSAGE.channel.send({ embeds: [embed] });
}

function stateContest(state) {
    var contestId = ARGS[1];

    // query contests
    SQL = "SELECT authorId, state, currentRound FROM contests WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contests = RECORDS;

    // check existing contest
    if (!contests.length) {
        MESSAGE.channel.send("Contest `" + contestId + "` does not exist...");
        return ERR_CONTEST_NOT_FOUND;
    }

    // check author
    if (contests[0].authorId !== MESSAGE.author.id) {
        MESSAGE.channel.send("Only the contest author can change the state...");
        return ERR_ONLY_AUTHOR;
    }

    // check for state change
    if (contests[0].state === state) {
        MESSAGE.channel.send("Contest is already in this state...");
        return ERR_SAME_STATE;
    }

    // prepare contest data for table "contests"
    MODTIME = getModtime();

    SQL = "UPDATE contests SET state = ?, modtime = ? WHERE contestId = ?";

    DATABASE_DATA = [
        state,
        MODTIME,
        contestId];

    writeDatabase(SQL, DATABASE_DATA);

    switch (state) {
        case 'Started':
            MESSAGE.channel.send("Contest has been started!");
            console.info("Contest '" + contestId + "' has been started!")

            printContestSheet(contestId);
            break;
        case 'Closed':
            MESSAGE.channel.send("Contest has been closed!");
            console.info("Contest '" + contestId + "' has been closed!")

            // print all round sheets
            for (var i = 0; i < contests[0].currentRound; i++) {
                printRoundSheet(contestId, i + 1);
            }

            printContestSheet(contestId);
            refreshStatistics(contestId);
            break;
        default:
            break;
    }
}

function roundContest() {
    var contestId = ARGS[1];

    // query contests
    SQL = "SELECT authorId, maxRoundCount, currentRound FROM contests WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contests = RECORDS;

    // check author
    if (contests[0].authorId !== MESSAGE.author.id) {
        MESSAGE.channel.send("Only the contest author can change the current round...");
        return ERR_ONLY_AUTHOR;
    }

    // check if last round
    if (contests[0].maxRoundCount > 0 && contests[0].currentRound > contests[0].maxRoundCount) {
        stateContest(STAT_CLOSED);
        return;
    }

    // prepare contest data for table "contests"
    MODTIME = getModtime();

    SQL = "UPDATE contests SET currentRound = ?, modtime = ? WHERE contestId = ?";

    DATABASE_DATA = [
        contests[0].currentRound + 1,
        MODTIME,
        contestId];

    writeDatabase(SQL, DATABASE_DATA);

    MESSAGE.channel.send("Round " + (contests[0].currentRound + 1) + " has started!");
    console.info("Contest '" + contestId + "' has reached round " + (contests[0].currentRound + 1) + "!");

    printRoundSheet(contestId, contests[0].currentRound);
    printContestSheet(contestId);
}

function entryContest() {
    const crypto = require('crypto');

    var contestId = ARGS[1];

    // query contests
    SQL = "SELECT state, entryCount, currentRound FROM contests WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contests = RECORDS;

    // check existing contest
    if (!contests.length) {
        MESSAGE.channel.send("Contest `" + contestId + "` does not exist...");
        return ERR_CONTEST_NOT_FOUND;
    }

    // check, whether contest is in state started / closed
    switch (contests[0].state) {
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
    var attendeeId = MESSAGE.author.id;

    // query attendees
    SQL = "SELECT attendeeId FROM contest_attendees WHERE contestId = ? AND attendeeId = ?";
    DATABASE_DATA = [contestId, attendeeId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestAttendees = RECORDS;

    // check for attendance
    if (!contestAttendees.length) {
        MESSAGE.channel.send("You're not attending this contest...");
        return ERR_NOT_ATTENDING;
    }

    // check for too many entries
    if (contests[0].entryCount > 0) {

        // query entries distinctly
        SQL = "SELECT DISTINCT entryId FROM contest_attendee_entries WHERE contestId = ? AND attendeeId = ?";
        DATABASE_DATA = [contestId, attendeeId];
        RECORDS = queryDatabase(SQL, DATABASE_DATA);

        var contestAttendeeEntriesDistinct = RECORDS;

        if (contestAttendeeEntriesDistinct.length >= contests[0].entryCount) {
            MESSAGE.channel.send("You can't log more entries...");
            return ERR_MAXIMUM_ENTRIES;
        }
    }

    // generate unique entry id
    var entryId = crypto.randomBytes(5).toString("hex");
    var contestAttendeeEntries;
    while (true) {

        // query entries
        SQL = "SELECT entryId FROM contest_attendee_entries WHERE entryId = ?";
        DATABASE_DATA = [entryId];
        RECORDS = queryDatabase(SQL, DATABASE_DATA);

        contestAttendeeEntries = RECORDS;

        // check existing entry
        if (!contestAttendeeEntries.length) {
            break;
        }

        entryId = crypto.randomBytes(5).toString("hex");
    }

    // query objectives
    SQL = "SELECT name FROM contest_objectives WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestObjectives = RECORDS;

    // check for objectives
    if (ARGS.length < 3) {
        MESSAGE.channel.send("Enter at least one objective...");
        return ERR_OBJECTIVE_MINIMUM;
    }

    // check whether objective is in arguments and fill value
    var objectiveId, objectiveValue;
    var objectiveValues = new Array(contestObjectives.length).fill(Number(0));
    for (var i = 0; i < contestObjectives.length; i++) {
        for (var j = 2; j < ARGS.length; j++) {
            objectiveId = parseInt(ARGS[j].substr(0, ARGS[j].indexOf('=')));

            // check numeric
            if (isNaN(objectiveId)) {
                continue;
            }

            // fill objective value
            if (objectiveId - 1 === i) {
                objectiveValue = parseFloat(ARGS[j].split('=')[1]);

                // check numeric
                if (isNaN(objectiveValue)) {
                    MESSAGE.channel.send("Value for objective `" + contestObjectives[i].name + "` couldn't be logged...");
                    console.info("Value for objective '" + contestObjectives[i].name + "' couldn't be logged by " + MESSAGE.author.username + ' (' + MESSAGE.author.id + ')...');

                    break;
                }

                objectiveValues[i] = objectiveValue;

                break;
            }
        }
    }

    // prepare contest data for table "contest_attendee_entries"
    for (var i = 0; i < objectiveValues.length; i++) {
        MODTIME = getModtime();

        SQL = `INSERT INTO contest_attendee_entries(
            contestId,
            attendeeId,
            entryId,
            objectiveName,
            objectiveValue,
            round,
            modtime
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`;

        DATABASE_DATA = [
            contestId,
            attendeeId,
            entryId,
            contestObjectives[i].name,
            objectiveValues[i],
            contests[0].currentRound,
            MODTIME];

        writeDatabase(SQL, DATABASE_DATA);
    }
    
    MESSAGE.channel.send("Your entry `" + entryId + "` has been logged!");
    console.info(MESSAGE.author.username + ' (' + MESSAGE.author.id + ') ' + "has logged an entry '" + entryId + "' in contest '" + contestId + "'!");

    isFinished = checkFinished(contestId);
    if (isFinished) {

        // prepare contest data for table "contests"
        MODTIME = getModtime();

        SQL = "UPDATE contests SET state = ?, modtime = ? WHERE contestId = ?";

        DATABASE_DATA = [
            STAT_CLOSED,
            MODTIME,
            contestId];
    
        writeDatabase(SQL, DATABASE_DATA);
    
        MESSAGE.channel.send("Contest has been closed!");
        console.info("Contest '" + contestId + "' has been closed!")
        printContestSheet(contestId);
    }
}

function updateEntry() {
    var entryId = ARGS[1];

    // query entries
    SQL = "SELECT contestId, entryId, attendeeId FROM contest_attendee_entries WHERE entryId = ?";
    DATABASE_DATA = [entryId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestAttendeeEntries = RECORDS;

    // check existing entry
    if (!contestAttendeeEntries.length) {
        MESSAGE.channel.send("Entry `" + entryId + "` does not exist...");
        return ERR_ENTRY_NOT_FOUND;
    }

    // query contests
    SQL = "SELECT contestId, state FROM contests WHERE contestId = ?";
    DATABASE_DATA = [contestAttendeeEntries[0].contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contests = RECORDS;

    // check, whether contest is in state started / closed
    switch (contests[0].state) {
        case STAT_OPEN:
            MESSAGE.channel.send("Contest `" + contests[0].contestId + "` hasn't started, yet...");
            return ERR_NOT_STARTED;
        case STAT_CLOSED:
            MESSAGE.channel.send("Contest `" + contests[0].contestId + "` is already closed...");
            return ERR_DEAD_CONTEST;
        default:
            break;
    }

    // query objectives
    SQL = "SELECT name FROM contest_objectives WHERE contestId = ?";
    DATABASE_DATA = [contests[0].contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestObjectives = RECORDS;

    // check owner
    if (contestAttendeeEntries[0].attendeeId !== MESSAGE.author.id) {
        MESSAGE.channel.send("You're not the author of this entry...");
        return ERR_ONLY_AUTHOR;
    }

    // check for objectives
    if (ARGS.length < 3) {
        MESSAGE.channel.send("Enter at least one objective...");
        return ERR_OBJECTIVE_MINIMUM;
    }

    // check whether objective is in arguments and fill value
    var objectiveId, objectiveValue;
    for (var i = 0; i < contestObjectives.length; i++) {
        for (var j = 2; j < ARGS.length; j++) {
            objectiveId = parseInt(ARGS[j].substr(0, ARGS[j].indexOf('=')));

            // check numeric
            if (isNaN(objectiveId)) {
                continue;
            }

            // fill objective value
            if (objectiveId - 1 === i) {
                objectiveValue = parseFloat(ARGS[j].split('=')[1]);

                // check numeric
                if (isNaN(objectiveValue)) {
                    MESSAGE.channel.send("Value for objective `" + contestObjectives[i].name + "` couldn't be logged...");
                    console.info("Value for objective '" + contestObjectives[i].name + "' couldn't be logged by " + MESSAGE.author.username + ' (' + MESSAGE.author.id + ')...');

                    break;
                }

                // prepare contest data for table "contest_attendee_entries"
                MODTIME = getModtime();

                SQL = "UPDATE contest_attendee_entries SET objectiveValue = ?, modtime = ? WHERE entryId = ? AND objectiveName = ?"

                DATABASE_DATA = [
                    objectiveValue,
                    MODTIME,
                    entryId,
                    contestObjectives[i].name];

                writeDatabase(SQL, DATABASE_DATA);
            }
        }
    }
    
    MESSAGE.channel.send("Your entry `" + entryId + "` has been updated!");
    console.info(MESSAGE.author.username + ' (' + MESSAGE.author.id + ') ' + "has updated an entry '" + entryId + "' in contest '" + contests[0].contestId + "'!");
}

function teamContest() {
    var contestId = ARGS[1];

    // query contests
    SQL = "SELECT authorId, state, currentRound FROM contests WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contests = RECORDS;

    // check existing contest
    if (!contests.length) {
        MESSAGE.channel.send("Contest `" + contestId + "` does not exist...");
        return ERR_CONTEST_NOT_FOUND;
    }

    // check author
    if (contests[0].authorId !== MESSAGE.author.id) {
        MESSAGE.channel.send("Only the contest author can generate teams...");
        return ERR_ONLY_AUTHOR;
    }

    // can't generate in state closed
    if (contests[0].state === STAT_CLOSED) {
        MESSAGE.channel.send("Contest `" + contestId + "` is already closed...");
        return ERR_DEAD_CONTEST;
    }

    if (ARGS.length < 3) {
        MESSAGE.channel.send("Enter the team sizes...");
        return ERR_TEAM_SIZE;
    }

    var teamSizes = [];
    var currentTeam = 0;
    var overallTeamSize = 0;
    for (var i = 2; i < ARGS.length; i++) {

        // fill team sizes
        teamSizes[currentTeam] = parseInt(ARGS[i]);
        if (isNaN(teamSizes[currentTeam])) {
            MESSAGE.channel.send("Enter a numeric value for the team size...");
            return ERR_NOT_NUMERIC;
        }

        overallTeamSize = overallTeamSize + teamSizes[currentTeam];

        currentTeam++;
    }

    // query attendees
    SQL = "SELECT attendeeId FROM contest_attendees WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestAttendees = RECORDS;

    // check for team size
    if (contestAttendees.length !== overallTeamSize) {
        MESSAGE.channel.send("Sum of teams doesn't match attendee count...");
        return ERR_TEAM_SIZE;
    }

    // draft attendees
    draftedAttendees = [];
    while (draftedAttendees.length < contestAttendees.length) {
        // random number
        draftedNumber = getRandomInt(contestAttendees.length);
        if (draftedAttendees.includes(draftedNumber)) {
            continue;
        }

        draftedAttendees[draftedAttendees.length] = draftedNumber;
    }

    // query teams
    SQL = "SELECT teamId FROM contest_attendee_teams WHERE contestId = ? AND round = ?";
    DATABASE_DATA = [contestId, contests[0].currentRound];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestAttendeeTeams = RECORDS;

    // write team to database
    var teamId = 1;
    var currentAttendee = 1;
    for (var i = 0; i < draftedAttendees.length; i++) {
        if (currentAttendee > teamSizes[teamId - 1]) {
            currentAttendee = 1;
            teamId++;
        }

        // check existing teams
        if (!contestAttendeeTeams.length) {
            MODTIME = getModtime();

            SQL = `INSERT INTO contest_attendee_teams(
                contestId,
                attendeeId,
                teamId,
                round,
                modtime
                ) VALUES (?, ?, ?, ?, ?)`;
    
            DATABASE_DATA = [
                contestId,
                contestAttendees[draftedAttendees[i]].attendeeId,
                teamId,
                contests[0].currentRound,
                MODTIME
            ];
        } else {
            MODTIME = getModtime();

            SQL = "UPDATE contest_attendee_teams SET teamId = ?, modtime = ? WHERE contestId = ? AND attendeeId = ? AND round = ?";
    
            DATABASE_DATA = [
                teamId,
                MODTIME,
                contestId,
                contestAttendees[draftedAttendees[i]].attendeeId,
                contests[0].currentRound
            ];
        }
        writeDatabase(SQL, DATABASE_DATA);

        currentAttendee++;
    }

    MESSAGE.channel.send("Teams have been generated for round " + contests[0].currentRound + "!");
    console.info("Teams for contest '" + contestId + "' have been generated by " + MESSAGE.author.username + ' (' + MESSAGE.author.id + ')!');

    printRoundSheet(contestId, contests[0].currentRound);
}

function init() {
    initializeDatabase();
}

function printContestSheet(contestId) {
    // create embed
    const embed = new MessageEmbed()
    .setDescription("")
    .setTimestamp();

    // query contests
    SQL = "SELECT * FROM contests WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contests = RECORDS;

    // query objectives
    SQL = "SELECT * FROM contest_objectives WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestObjectives = RECORDS;

    // query attendees
    SQL = "SELECT * FROM contest_attendees WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestAttendees = RECORDS;

    // display objectives example
    var objectivesStringExample = "";
    for (var i = 0; i < contestObjectives.length; i++) {
        objectivesStringExample = objectivesStringExample + ' ' + (i + 1) + '=' + "0";
    }

    // prepare rated symbol
    var ratedString = "";
    if (contests[0].rated === 1) {
        ratedString = " • `⭐`";
    }

    // display contest state
    switch(contests[0].state) {
        case STAT_OPEN:
            embed.setTitle("Contest `" + contestId + "` • `OPEN`" + ratedString);
            embed.setDescription("`!cry contest join " + contestId + '`');
            embed.setColor("#00ccff");
            break;
        case STAT_STARTED:
            embed.setTitle("Contest `" + contestId + "` • `STARTED`" + ratedString);
            embed.setDescription("`!cry contest add " + contestId + objectivesStringExample + '`');
            embed.setColor("#99ff99");
            break;
        case STAT_CLOSED:
            embed.setTitle("Contest `" + contestId + "` • `CLOSED`" + ratedString);
            embed.setDescription("This contest is over");
            embed.setColor("#ff0000");
            break;
        default:
            embed.setTitle("Contest `" + contestId + "` • `UNDEFINED`" + ratedString);
            embed.setDescription("");
            embed.setColor("#ffffff");
            break;
    }

    // display options
    var optionsString = "";
    
    if (contests[0].type) {
        optionsString = optionsString + "Type".padEnd(16) + contests[0].type + "\n";
    }

    if (contests[0].entryCount > 0) {
        optionsString = optionsString + "Entry Count".padEnd(16) + contests[0].entryCount + "\n";
    }

    if (contests[0].maxRoundCount > 0) {
        optionsString = optionsString + "Round Count".padEnd(16) + contests[0].maxRoundCount + "\n";
    }

    if (optionsString !== "") {
        embed.addFields({
            name: "Options 📚",
            value: '```' + optionsString + '```',
            inline: false
        });
    }

    // display objectives
    var objectivesString = "";
    for (var i = 0; i < contestObjectives.length; i++) {
        objectivesString = objectivesString + '[' + (i + 1) + '] ' + contestObjectives[i].name.padEnd(11) + ' (' + contestObjectives[i].value + 'P)\n';
    }

    embed.addFields({
        name: "Objectives 🎗️ ",
        value: '```' + objectivesString + '```',
        inline: false
    });

    // displays attendees
    var attendees = [];
    var attendeePoints, attendeePointsRounded;
    for (var i = 0; i < contestAttendees.length; i++) {
        // calculate points
        attendeePoints = calculatePoints(contestId, contestAttendees[i].attendeeId, 0);
        attendeePointsRounded = Math.round(attendeePoints * 100) / 100;

        var attendeeData = {
            "name": contestAttendees[i].name,
            "points": attendeePointsRounded
        }

        attendees.push(attendeeData);
    }

    // sort attendees
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

        podiumString = podiumString + sortedAttendees[i].name + '\n';
    }

    if (podiumString !== "") {
        embed.addFields({
            name: "Podium 🏆",
            value: '```' + podiumString + '```',
            inline: false
        });
    }

    var attendeesString = "";
    for (var i = 0; i < sortedAttendees.length; i++) {
        attendeesString = attendeesString + sortedAttendees[i].name.padEnd(15) + ' (' + sortedAttendees[i].points + ')\n';
    }

    if (attendeesString !== "") {
        embed.addFields({
            name: "Attendees 🤠",
            value: '```' + attendeesString + '```',
            inline: false
        });
    }

    MESSAGE.channel.send({ embeds: [embed] });
}

function printRoundSheet(contestId, contestRound) {
    // create embed
    const embed = new MessageEmbed()
    .setDescription("")
    .setTimestamp();

    // query contests
    SQL = "SELECT * FROM contests WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contests = RECORDS;

    // query objectives
    SQL = "SELECT * FROM contest_objectives WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestObjectives = RECORDS;

    // query attendees
    SQL = "SELECT * FROM contest_attendees WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestAttendees = RECORDS;

    // display contest round
    embed.setTitle("Round " + contestRound);
    embed.setDescription("");
    embed.setColor("#ff5733");

    // displays attendees
    var attendees = [];
    var attendeePoints, attendeePointsRounded;
    for (var i = 0; i < contestAttendees.length; i++) {
        // calculate points
        attendeePoints = calculatePoints(contestId, contestAttendees[i].attendeeId, contestRound);
        attendeePointsRounded = Math.round(attendeePoints * 100) / 100;

        var attendeeData = {
            "name": contestAttendees[i].name,
            "points": attendeePointsRounded
        }

        attendees.push(attendeeData);
    }

    var sortedAttendees = sortAttendees(attendees);

    var attendeesString = "";
    for (var i = 0; i < sortedAttendees.length; i++) {
        attendeesString = attendeesString + sortedAttendees[i].name.padEnd(15) + ' (' + sortedAttendees[i].points + ')\n';
    }

    if (attendeesString !== "") {
        embed.addFields({
            name: "Results 🎬",
            value: '```' + attendeesString + '```',
            inline: true
        });
    }

    // prepare player statistics
    var playerStatisticsString = "";

    var objectiveStatistics;
    var contestAttendeeEntries;
    for (var i = 0; i < contestAttendees.length; i++) {
        objectiveStatistics = new Array(contestObjectives.length).fill(Number(0));

        for (var j = 0; j < contestObjectives.length; j++) {

            // query entries
            SQL = "SELECT * FROM contest_attendee_entries WHERE contestId = ? AND attendeeId = ? AND objectiveName = ? AND round = ?";
            DATABASE_DATA = [contestId, contestAttendees[i].attendeeId, contestObjectives[j].name, contestRound];
            RECORDS = queryDatabase(SQL, DATABASE_DATA);
            
            contestAttendeeEntries = RECORDS;

            for (var k = 0; k < contestAttendeeEntries.length; k++) {
                objectiveStatistics[j] = objectiveStatistics[j] + contestAttendeeEntries[k].objectiveValue;
            }

            // display objective values
            playerStatisticsString = playerStatisticsString + objectiveStatistics[j];

            playerStatisticsString = playerStatisticsString + " ";
        }
        playerStatisticsString = playerStatisticsString + "- " + contestAttendees[i].name + '\n';
    }

    if (playerStatisticsString !== "") {
        embed.addFields({
            name: "Statistics 📈",
            value: '```' + playerStatisticsString + '```',
            inline: true
        });
    }

    // query teams
    SQL = "SELECT * FROM contest_attendee_teams WHERE contestId = ? AND round = ? ORDER BY teamId ASC";
    DATABASE_DATA = [contestId, contestRound];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestAttendeeTeams = RECORDS;

    // prepare teams
    var teamsString = "";
    var lastTeamId = 0;
    if (contestAttendeeTeams.length) {
        for (var i = 0; i < contestAttendeeTeams.length; i++) {
            if (contestAttendeeTeams[i].teamId !== lastTeamId) {
                teamsString = teamsString + "\nTeam " + contestAttendeeTeams[i].teamId + "\n---------------\n";
                lastTeamId = contestAttendeeTeams[i].teamId;
            }

            SQL = "SELECT name FROM contest_attendees WHERE contestId = ? AND attendeeId = ?";
            DATABASE_DATA = [contestId, contestAttendeeTeams[i].attendeeId];
            RECORDS = queryDatabase(SQL, DATABASE_DATA);

            var contestAttendees = RECORDS;

            teamsString = teamsString + "- " + contestAttendees[0].name + "\n";
        }

        embed.addFields({
            name: "Teams 🤝",
            value: '```' + teamsString + '```',
            inline: false
        });
    }

    MESSAGE.channel.send({ embeds: [embed] });
}

function calculatePoints(contestId, attendeeId, contestRound) {
    // query objectives
    SQL = "SELECT name, value FROM contest_objectives WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestObjectives = RECORDS;

    // query entries
    SQL = "SELECT round, objectiveName, objectiveValue FROM contest_attendee_entries WHERE contestId = ? AND attendeeId = ?";
    DATABASE_DATA = [contestId, attendeeId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestAttendeeEntries = RECORDS;

    // calculate points for every entry
    var points = 0;
    for (var i = 0; i < contestAttendeeEntries.length; i++) {

        // check for round
        if (contestRound > 0 && contestAttendeeEntries[i].round !== contestRound) {
            continue;
        }

        // multiply points by value of objective
        for (var j = 0; j < contestObjectives.length; j++) {
            if (contestAttendeeEntries[i].objectiveName === contestObjectives[j].name) {
                points = points + (contestObjectives[j].value * contestAttendeeEntries[i].objectiveValue);
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
    // query contests
    SQL = "SELECT entryCount FROM contests WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contests = RECORDS;

    // no auto-finish in unlimited mode
    if (contests[0].entryCount == 0) {
        return false;
    }

    // query attendees
    SQL = "SELECT attendeeId FROM contest_attendees WHERE contestId = ?";
    DATABASE_DATA = [contestId];
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contestAttendees = RECORDS;

    // check finished
    var isFinished = true;
    var contestAttendeeEntriesDistinct;
    for (var i = 0; i < contestAttendees.length; i++) {
        // query entries distinctly
        SQL = "SELECT DISTINCT entryId FROM contest_attendee_entries WHERE contestId = ? AND attendeeId = ?";
        DATABASE_DATA = [contestId, contestAttendees[i].attendeeId];
        RECORDS = queryDatabase(SQL, DATABASE_DATA);
    
        contestAttendeeEntriesDistinct = RECORDS;

        if (contestAttendeeEntriesDistinct.length < contests[0].entryCount) {
            isFinished = false;
        }
    }

    return isFinished;
}

function refreshStatistics(contestId) {
    // query contests
    if (contestId) {
        SQL = "SELECT contestId, state, currentRound, rated FROM contests WHERE contestId = ?";
        DATABASE_DATA = [contestId];
    } else {
        SQL = "SELECT contestId, state, currentRound, rated FROM contests";
        DATABASE_DATA = [];
    }
    RECORDS = queryDatabase(SQL, DATABASE_DATA);

    var contests = RECORDS;

    // check for no contests
    if (!contests.length) {
        if (contestId) {
            MESSAGE.channel.send("Contest `" + contestId + "` does not exist...");
            return ERR_CONTEST_NOT_FOUND;
        } else {
            MESSAGE.channel.send("There are no contests...");
            return ERR_NO_CONTESTS;
        }
    }
    
    // truncate general statistics table
    if (contestId) {
        SQL = "DELETE FROM contest_attendee_statistics WHERE contestId = ?";
        DATABASE_DATA = [contestId];
    } else {
        SQL = "DELETE FROM contest_attendee_statistics";
        DATABASE_DATA = [];
    }
    writeDatabase(SQL, DATABASE_DATA);

    // truncate objective statistics table
    if (contestId) {
        SQL = "DELETE FROM contest_attendee_objective_statistics WHERE contestId = ?";
        DATABASE_DATA = [contestId];
    } else {
        SQL = "DELETE FROM contest_attendee_objective_statistics";
        DATABASE_DATA = [];
    }
    writeDatabase(SQL, DATABASE_DATA);

    // refresh general statistics
    for (var i = 0; i < contests.length; i++) {

        // check, whether contest hasn't been closed, yet
        if (contests[i].state !== STAT_CLOSED) {
            if (contestId) {
                MESSAGE.channel.send("Contest `" + contestId + "` hasn't been closed, yet...");
                return;
            } else {
                console.info("Skipping statistics for contest '" + contests[i].contestId + "' since it's not closed...");
                continue;
            }
        }

        // check, whether contest is rated
        if (contests[i].rated === 0) {
            if (contestId) {
                MESSAGE.channel.send("Contest `" + contestId + "` is not rated...");
                return;
            } else {
                console.info("Skipping statistics for contest '" + contests[i].contestId + "' since it's not rated...");
                continue;
            }
        }

        // query attendees
        SQL = "SELECT attendeeId FROM contest_attendees WHERE contestId = ?";
        DATABASE_DATA = [contests[i].contestId];
        RECORDS = queryDatabase(SQL, DATABASE_DATA);

        var contestAttendees = RECORDS;

        // check, whether contest has no attendees
        if (!contestAttendees.length) {
            if (contestId) {
                MESSAGE.channel.send("Contest `" + contestId + "` has no attendees...");
                return;
            } else {
                console.info("Skipping statistics for contest '" + contests[i].contestId + "' since it has no attendees...");
                continue;
            }
        }

        // query objectives
        SQL = "SELECT name, value FROM contest_objectives WHERE contestId = ?";
        DATABASE_DATA = [contests[i].contestId];
        RECORDS = queryDatabase(SQL, DATABASE_DATA);

        var contestObjectives = RECORDS;

        // calculate points and places for every round
        for (var j = 0; j <= contests[i].currentRound; j++) {

            // prepare attendees
            var attendees = [];
            var attendeePoints, attendeePointsRounded;
            for (var k = 0; k < contestAttendees.length; k++) {
                // calculate points
                attendeePoints = calculatePoints(contests[i].contestId, contestAttendees[k].attendeeId, j);
                attendeePointsRounded = Math.round(attendeePoints * 100) / 100;

                var attendeeData = {
                    "id": contestAttendees[k].attendeeId,
                    "points": attendeePointsRounded
                }

                attendees.push(attendeeData);
            }

            // sort attendees
            var sortedAttendees = sortAttendees(attendees);

            var place = 0;
            var position = 0;
            for (var k = 0; k < sortedAttendees.length; k++) {
        
                // check for same place
                if (k > 0) {
                    position++;
        
                    if (sortedAttendees[k - 1].points > sortedAttendees[k].points) {
                        place = position;
                    }
                }

                // prepare contest data for table "contests_attendee_statistics"
                MODTIME = getModtime();

                SQL = `INSERT INTO contest_attendee_statistics(
                    contestId,
                    attendeeId,
                    round,
                    points,
                    place,
                    modtime
                    ) VALUES (?, ?, ?, ?, ?, ?)`;

                DATABASE_DATA = [
                    contests[i].contestId,
                    sortedAttendees[k].id,
                    j,
                    sortedAttendees[k].points,
                    place + 1,
                    MODTIME
                ];

                writeDatabase(SQL, DATABASE_DATA);

                // refresh objective statistics
                for (var l = 0; l < contestObjectives.length; l++) {

                    // query entries (sum of objectives)
                    if (j > 0) {
                        SQL = "SELECT sum(objectiveValue) AS objectiveSum FROM contest_attendee_entries WHERE contestId = ? AND attendeeId = ? AND round = ? AND objectiveName = ?";
                        DATABASE_DATA = [contests[i].contestId, sortedAttendees[k].id, j, contestObjectives[l].name];
                    } else {
                        SQL = "SELECT sum(objectiveValue) AS objectiveSum FROM contest_attendee_entries WHERE contestId = ? AND attendeeId = ? AND objectiveName = ?";
                        DATABASE_DATA = [contests[i].contestId, sortedAttendees[k].id, contestObjectives[l].name];
                    }
                    RECORDS = queryDatabase(SQL, DATABASE_DATA);

                    var contestAttendeeEntriesSum = RECORDS;
                    
                    // check for no entries in that round
                    var objectiveSum = 0;
                    if (contestAttendeeEntriesSum[0].objectiveSum) {
                        objectiveSum = contestAttendeeEntriesSum[0].objectiveSum;
                    }

                    // prepare contest data for table "contests_attendee_objective_statistics"
                    MODTIME = getModtime();

                    SQL = `INSERT INTO contest_attendee_objective_statistics(
                        contestId,
                        attendeeId,
                        round,
                        objectiveName,
                        objectiveValue,
                        modtime
                        ) VALUES (?, ?, ?, ?, ?, ?)`;

                    DATABASE_DATA = [
                        contests[i].contestId,
                        sortedAttendees[k].id,
                        j,
                        contestObjectives[l].name,
                        objectiveSum,
                        MODTIME
                    ];

                    writeDatabase(SQL, DATABASE_DATA);
                }
            }
        }
        console.info("Statistics of contest '" + contests[i].contestId + "' have been refreshed!");
    }

    if (contestId) {
        MESSAGE.channel.send("Statistics of contest `" + contestId + "` have been refreshed!");
    } else {
        MESSAGE.channel.send("All statistics have been refreshed!");
    }
}

function initializeDatabase() {
    const sqlite3 = require('better-sqlite3');

    // connect to database
    const db = new sqlite3(DB_PATH);

    // create table "contests"
    SQL = `CREATE TABLE IF NOT EXISTS contests_bak (
        id INTEGER PRIMARY KEY,
        contestId TEXT NOT NULL UNIQUE,
        creationDate TEXT NOT NULL,
        state TEXT NOT NULL,
        authorId TEXT NOT NULL,
        authorName TEXT NOT NULL,
        entryCount INTEGER NOT NULL,
        currentRound INTEGER NOT NULL,
        maxRoundCount INTEGER NOT NULL,
        rated INTEGER NOT NULL,
        type TEXT NOT NULL,
        modtime TEXT NOT NULL)`;

    db.prepare(SQL).run();

    // create table "contest_objectives"
    SQL = `CREATE TABLE IF NOT EXISTS contest_objectives (
        id INTEGER PRIMARY KEY,
        contestId TEXT NOT NULL,
        name TEXT NOT NULL,
        value REAL NOT NULL,
        modtime TEXT NOT NULL)`;
        
    db.prepare(SQL).run();

    // create table "contest_attendees"
    SQL = `CREATE TABLE IF NOT EXISTS contest_attendees (
        id INTEGER PRIMARY KEY,
        contestId TEXT NOT NULL,
        attendeeId TEXT NOT NULL,
        name TEXT NOT NULL,
        modtime TEXT NOT NULL)`;
        
    db.prepare(SQL).run();

    // create table "contest_attendee_entries"
    SQL = `CREATE TABLE IF NOT EXISTS contest_attendee_entries (
        id INTEGER PRIMARY KEY,
        contestId TEXT NOT NULL,
        attendeeId TEXT NOT NULL,
        entryId TEXT NOT NULL,
        objectiveName TEXT NOT NULL,
        objectiveValue REAL NOT NULL,
        round INTEGER NOT NULL,
        modtime TEXT NOT NULL)`;
        
    db.prepare(SQL).run();

    // create table "contest_attendee_teams"
    SQL = `CREATE TABLE IF NOT EXISTS contest_attendee_teams (
        id INTEGER PRIMARY KEY,
        contestId TEXT NOT NULL,
        attendeeId TEXT NOT NULL,
        teamId INTEGER NOT NULL,
        round INTEGER NOT NULL,
        modtime TEXT NOT NULL)`;
        
    db.prepare(SQL).run();

    // create table "contest_attendee_statistics"
    SQL = `CREATE TABLE IF NOT EXISTS contest_attendee_statistics (
        id INTEGER PRIMARY KEY,
        contestId TEXT NOT NULL,
        attendeeId TEXT NOT NULL,
        round INTEGER NOT NULL,
        points INTEGER NOT NULL,
        place INTEGER NOT NULL,
        modtime TEXT NOT NULL)`;
        
    db.prepare(SQL).run();

    // create table "contest_attendee_objective_statistics"
    SQL = `CREATE TABLE IF NOT EXISTS contest_attendee_objective_statistics (
        id INTEGER PRIMARY KEY,
        contestId TEXT NOT NULL,
        attendeeId TEXT NOT NULL,
        round INTEGER NOT NULL,
        objectiveName TEXT NOT NULL,
        objectiveValue REAL NOT NULL,
        modtime TEXT NOT NULL)`;
        
    db.prepare(SQL).run();

    db.close();
}

function writeDatabase(sql, databaseData) {
    const sqlite3 = require('better-sqlite3');

    // connect to database
    const db = new sqlite3(DB_PATH);

    db.prepare(sql).run(databaseData);
    db.close();
};


function queryDatabase(sql, databaseData) {
    const sqlite3 = require('better-sqlite3');

    // connect to database
    const db = new sqlite3(DB_PATH);

    var records = db.prepare(sql).all(databaseData);
    db.close();

    return records;
};

function getModtime() {
    return new Date().toJSON();
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function shortenName(name) {
    if (name.length > MAXIMUM_NAME_LENGTH) {
        return name.substr(0, MAXIMUM_NAME_LENGTH - 3).concat("...");
    } else {
        return name;
    }
}