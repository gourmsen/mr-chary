const { Client, Intents, Collection, MessageEmbed } = require("discord.js");
require('better-logging')(console);

module.exports = {
    name: 'version',
    description: "Prints out the version history!",
    execute(message, args) {

        const embed = new MessageEmbed()
        .setTitle("📕 Version History")
        .setDescription("Version `0.2.6`")
        .setColor("#a844ff")
        .setTimestamp()
        .addFields(
            {name: "> 0.2", value: "" +
                                   "Added `+bloodlineLevel` argument `(0.2.6)`. \n" +
                                   "Added dualies functionality `(0.2.5)`. \n" +
                                   "Added limit for melee weapons `(0.2.4.1)`. \n" +
                                   "Added multiple ammo types `(0.2.4)`. \n" +
                                   "Added `+fillKit` argument `(0.2.3)`. \n" +
                                   "Added `+fillMelee` argument `(0.2.2)`. \n" +
                                   "Added `+fillSlots` argument `(0.2.1)`. \n" +
                                   "Added random loadout generator `(0.2.0)`.",
                                    inline: false},
            {name: "> 0.1", value: "`0.1.0` - Added basic list functionality.", inline: false},
        );

        message.channel.send({ embeds: [embed] });
    }
}