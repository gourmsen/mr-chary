const { Client, Intents, Collection, MessageEmbed } = require("discord.js");
require('better-logging')(console);

module.exports = {
    name: 'help',
    description: "Prints out the help of this bot!",
    execute(message, args) {

        const embed = new MessageEmbed()
        .setTitle("📙 Help")
        .setDescription("List of commands")
        .setColor("#fee75c")
        .setTimestamp()
        .addFields(
            {name: "`!cry help`", value: "Prints this help.", inline: false},
            {name: "`!cry list (-g|--group=<name>)`", value: "Lists all available items.", inline: false},
            {name: "`!cry random (-fs|--fill-slots) (-fm|--force-melee) (-fk|--force-kit)`", value: "Generates a random loadout.", inline: false}
        );

        message.channel.send({ embeds: [embed] });
    }
}