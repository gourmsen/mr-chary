const { MessageEmbed } = require("discord.js");
require('better-logging')(console);

var MESSAGE, ARGS;

module.exports = {
    name: 'help',
    description: "Prints out the help of this bot!",
    execute(message, args) {

        MESSAGE = message;
        ARGS = args;
        switch(ARGS[0]) {
            // functions
            case "c":
            case "contest":
                contestHelp();
                break;
            default:
                defaultHelp();
                break;
        }

    }
}

function defaultHelp() {
    const embed = new MessageEmbed()
    .setTitle("📙 General Help")
    .setDescription("Use `!cry help <command>` for more information")
    .setColor("#fee75c")
    .setTimestamp()
    .addFields(
        {name: "`!cry help`", value: "Prints this help.", inline: false},
        {name: "`!cry list (-g|--group=<name>)`", value: "Lists all available items.", inline: false},
        {name: "`!cry random (-fs|--fill-slots) (-fm|--force-melee) (-fk|--force-kit) (-bl|--bloodline-level=<value>)`", value: "Generates a random loadout.", inline: false},
        {name: "`!cry contest (create|delete|info|personal|board|join|leave|start|round|end|add|list|update|team)`", value: "Manages the contest.", inline: false}
    );

    MESSAGE.channel.send({ embeds: [embed] });
}

function contestHelp() {
    const embedHelp = new MessageEmbed()
    .setTitle("📙 Contest Help")
    .setDescription("List of commands")
    .setColor("#fee75c")
    .setTimestamp()
    .addFields(
        {name: "`!cry contest create [entries] [max rounds] [objective=value>:n]`", value: "Creates a new contest, e.g. `!cry contest create 3 Token=4 Kill=2 Assist=1 Revive=1` for a contest with 3 entries per attendee and 4 objectives. Entries are unlimited, when count is 0.", inline: false},
        {name: "`!cry contest delete [contest_id]`",                                value: "Deletes the contest.", inline: false},
        {name: "`!cry contest info [contest_id]`",                                  value: "Shows information about the contest.", inline: false},
        {name: "`!cry contest personal [contest_id]`",                              value: "Shows personal statistics about the contest.", inline: false},
        {name: "`!cry contest board`",                                              value: "Shows the leaderboard.", inline: false},
        {name: "`!cry contest join [contest_id]`",                                  value: "Join the contest.", inline: false},
        {name: "`!cry contest leave [contest_id]`",                                 value: "Leave the contest.", inline: false},
        {name: "`!cry contest start [contest_id]`",                                 value: "Start the contest (only when author of the contest).", inline: false},
        {name: "`!cry contest round [contest_id]`",                                 value: "Start the next round (only when author of the contest).", inline: false},
        {name: "`!cry contest end [contest_id]`",                                   value: "Close the contest (only when author of the contest).", inline: false},
        {name: "`!cry contest add [contest_id] <objective=value>:n`",               value: "Log an entry for the contest.", inline: false},
        {name: "`!cry contest update [entry_id] <objective=value>:n`",              value: "Update an entry of the contest.", inline: false},
        {name: "`!cry contest team [contest_id] [team_size]:n`",                    value: "Generate teams for the current round.", inline: false},
        {name: "`!cry contest list`",                                               value: "List all contests.", inline: false}
    );

    MESSAGE.channel.send({ embeds: [embedHelp] });

    const embedTutorial = new MessageEmbed()
    .setTitle("📙 Contest Tutorial")
    .setDescription("Example Contest")
    .setColor("#fee75c")
    .setTimestamp()
    .addFields(
        {name: "1. Contest Creation",   value: "A new contest is created with the `!cry contest create` command. \
                                                For example, `!cry contest create 3 Token=4 Kill=2 Assist=1 Revive=1` creates a contest with 3 entries per attendee \
                                                and the 4 objectives `Token (4 Points)`, `Kill (2 Points)`, `Assist (1 Point)` and `Revive (1 Point)`. \
                                                This creates a unique contest id like `1a2b3c`", inline: false},
        {name: "2. Join Phase",         value: "After the contest has been created, the contest is open. Everyone can join an open contest until it starts. \
                                                All information on the contest can be shown with `!cry contest info [contest_id]`.", inline: false},
        {name: "3. Entry Phase",        value: "The contest can be started with `!cry contest start [contest_id]`. Everyone can add their results after the contest has started and hasn't already closed. \
                                                Entries can be logged with `!cry contest add [contest_id]`. In the above example, I can log 3 kills and 2 revives with `!cry contest add 1a2b3c 2=3 4=2`.", inline: false},
        {name: "4. End Phase",          value: "When everyone has logged the maximum amount of entries the contest will end. A contest can also be manually closed with `!cry contest end [contest_id]`.", inline: false},
    );

    MESSAGE.channel.send({ embeds: [embedTutorial] });
}