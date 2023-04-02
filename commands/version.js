const { MessageEmbed } = require("discord.js");
require('better-logging')(console);

module.exports = {
    name: 'version',
    description: "Prints out the version history!",
    execute(message, args) {

        const embed = new MessageEmbed()
        .setTitle("📕 Version History")
        .setDescription("Version `0.4.5`")
        .setColor("#a844ff")
        .setTimestamp()
        .addFields(
            {name: "> 0.4", value: "" +
                                   "Added contest options `(0.4.5)`. \n" +
                                   "Added delete/leave `(0.4.4)`. \n" +
                                   "Added leaderboard `(0.4.3)`. \n" +
                                   "Added teams `(0.4.2)`. \n" +
                                   "Added entry update `(0.4.1)`. \n" +
                                   "Added database `(0.4.0)`.", inline: false},
            {name: "> 0.3", value: "" +
                                   "Added round system (`0.3.2`). \n" +
                                   "Added personal statistics (`0.3.1`). \n" +
                                   "Added basic contest system (`0.3.0`).", inline: false},
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
            {name: "> 0.1", value: "Added basic list functionality `(0.1.0)`.", inline: false}
        );

        message.channel.send({ embeds: [embed] });
    }
}