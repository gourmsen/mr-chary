const { Client, Intents, Collection, MessageEmbed } = require("discord.js");

var primaryWeapon;
var secondaryWeapon;
var tools;
var consumables;

module.exports = {
    name: 'random',
    description: "Generates a random loadout!",
    execute(message, args) {
        var usedArguments = "Arguments: ";

        // TODO: Implement arguments
        var argumentForceMelee = false;
        var argumentForceKit = false;
        var argumentFillSlots = false;
        var argumentAllowDualWield = false;
        var argumentBloodlineLevel = 0;

        // read arguments
        for(var a = 0; a < args.length; a++) {
            var argSingleName = args[a];

            var argName = args[a].substr(0, args[a].indexOf('='));
            var argValue = args[a].split('=')[1];

            switch (argName) {
                case "-bl":
                case "--bloodline-level":
                    argumentBloodlineLevel = argValue;
                    usedArguments = usedArguments + "+bloodlineLevel=" + argValue + " ";
                    break;
                default:
                    break;
            }

            switch (argSingleName) {
                case "-fm":
                case "--force-melee":
                    argumentForceMelee = true;
                    usedArguments = usedArguments + "+forceMelee ";
                    break;
                case "-fk":
                case "--force-kit":
                    argumentForceKit = true;
                    usedArguments = usedArguments + "+forceKit ";
                    break;
                case "-fs":
                case "--fill-slots":
                    argumentFillSlots = true;
                    usedArguments = usedArguments + "+fillSlots ";
                    break;
                case "-ad":
                case "--allow-dual-wield":
                    argumentAllowDualWield = true;
                    usedArguments = usedArguments + "+allowDualWield ";
                    break;
                default:
                    break;
            }
        }

        var maxCount = getItemCount("Weapons");

        var randomId = 0;
        // get primary weapon
        randomId = Math.floor(Math.random() * maxCount + 1);
        primaryWeapon = getItem(randomId, "Weapons");

        // get secondary weapon
        var hasAllowedSlots = false;
        while (!hasAllowedSlots) {
            randomId = Math.floor(Math.random() * maxCount + 1);
            secondaryWeapon = getItem(randomId, "Weapons");
            var overallSlots = primaryWeapon[2].slots + secondaryWeapon[2].slots;
            if (overallSlots > 4) {
                console.log("random.js: Too many slots, re-roll secondary weapon (" + secondaryWeapon[1].name, secondaryWeapon[2].name + " - " + secondaryWeapon[2].slots + " Slots)");
                hasAllowedSlots = false;
                continue;
            }

            // +fillSlots (all 4 slots need to be filled)
            if (argumentFillSlots && overallSlots < 4) {
                console.log("random.js: +fillSlots: Slots not filled, re-roll secondary (" + secondaryWeapon[1].name, secondaryWeapon[2].name + " - " + secondaryWeapon[2].slots + " Slots)");
                hasAllowedSlots = false;
                continue;
            }

            hasAllowedSlots = true;
        }

        // switch weapons if primary occupies less slots
        if (secondaryWeapon[2].slots > primaryWeapon[2].slots) {
            console.log("random.js: Switched weapon slots, because " + primaryWeapon[1].name, primaryWeapon[2].name + " < " + secondaryWeapon[1].name, secondaryWeapon[2].name);
            var tempWeapon = primaryWeapon;
            primaryWeapon = secondaryWeapon;
            secondaryWeapon = tempWeapon;
        }

        // get tools
        maxCount = getItemCount("Tools");
        tools = [];
        for (var i = 0; i < 4; i++) {
            randomId = Math.floor(Math.random() * maxCount + 1);
            tools[i] = getItem(randomId, "Tools");
        }
        
        // get consumables
        maxCount = getItemCount("Consumables");
        consumables = [];
        for (var i = 0; i < 4; i++) {
            randomId = Math.floor(Math.random() * maxCount + 1);
            consumables[i] = getItem(randomId, "Consumables");
        }

        // show embed
        const embed = new MessageEmbed()
        .setTitle("Random Loadout")
        .setDescription('`' + usedArguments + '`')
        .setColor("#7e42f5")
        .setTimestamp();
        
        embed.addField("Primary Weapon", "`" + primaryWeapon[1].name +
        " (" + primaryWeapon[2].name + ")`", true);

        // add field for ammo for shootable weapons
        if (primaryWeapon[0].name !== 'Melee') {
            if (primaryWeapon[1].ammoSlots === 1) {
                embed.addField("Ammunition", "`" + primaryWeapon[3][0].name + " " + primaryWeapon[3][0].type + "`", true);
                embed.addField('\u200B', '\u200B', true);
            }

            if (primaryWeapon[1].ammoSlots === 2) {
                embed.addField("Ammunition", "`" + primaryWeapon[3][0].name + " " + primaryWeapon[3][0].type + "` " + 
                                             "`" + primaryWeapon[3][1].name + " " + primaryWeapon[3][1].type + "`", true);
                embed.addField('\u200B', '\u200B', true);
            }
        } else {
            embed.addField('\u200B', '\u200B', true);
            embed.addField('\u200B', '\u200B', true);
        }

        embed.addField("Secondary Weapon", "`" + secondaryWeapon[1].name +
        " (" + secondaryWeapon[2].name + ")`", true);

        // add field for ammo for shootable weapons
        if (secondaryWeapon[0].name !== 'Melee') {
            if (secondaryWeapon[1].ammoSlots === 1) {
                embed.addField("Ammunition", "`" + secondaryWeapon[3][0].name + " " + secondaryWeapon[3][0].type + "`", true);
                embed.addField('\u200B', '\u200B', true);
            }

            if (secondaryWeapon[1].ammoSlots === 2) {
                embed.addField("Ammunition", "`" + secondaryWeapon[3][0].name + " " + secondaryWeapon[3][0].type + "` " + 
                                             "`" + secondaryWeapon[3][1].name + " " + secondaryWeapon[3][1].type + "`", true);
                embed.addField('\u200B', '\u200B', true);
            }
        } else {
            embed.addField('\u200B', '\u200B', true);
            embed.addField('\u200B', '\u200B', true);
        }

        embed.addField("Tools", "`" + tools[0][2].name + "`" +
        ", `" + tools[1][2].name + "`" +
        ", `" + tools[2][2].name + "`" +
        ", `" + tools[3][2].name + "`", false);
        
        embed.addField("Consumables", "`" + consumables[0][2].name + "`" +
        ", `" + consumables[1][2].name + "`" +
        ", `" + consumables[2][2].name + "`" +
        ", `" + consumables[3][2].name + "`", false);

        message.channel.send({ embeds: [embed] });
    }
}

function getItemCount(mode) {
    var itemCount = 0;

    // load items.json
    const fs = require('fs');
    var itemFile = fs.readFileSync('res/items.json', 'utf-8');
    try {
        const itemData = JSON.parse(itemFile);

        // read all groups
        for (var i = 0; i < itemData.groups.length; i++) {
            var itemGroup = itemData.groups[i];

            // only use items in mode
            switch (mode) {
                case "Weapons":
                    if (itemGroup.name !== "Rifles" &&
                        itemGroup.name !== "Pistols" &&
                        itemGroup.name !== "Shotguns" &&
                        itemGroup.name !== "Melee" &&
                        itemGroup.name !== "Bows")
                        continue;
                    break;
                case "Tools":
                    if (itemGroup.name !== "Tools")
                        continue;
                    break;
                case "Consumables":
                    if (itemGroup.name !== "Consumables")
                        continue;
                    break;
                default:
                    break;
            }

            // read all items
            for (var j = 0; j < itemGroup.items.length; j++) {
                var item = itemGroup.items[j];

                // read all variants
                for (var k = 0; k < item.variants.length; k++) {
                    itemCount++;
                }
            }
        }
    } catch (err) {
        console.log(err);
    }
    return itemCount;
}

/**
 * 
 * Searches for item with specified itemId in modes {"Weapons", "Tools, "Consumables"}
 * 
 * @param {*} itemId 
 * @param {*} mode 
 * @returns [itemGroup, item, variant, ammoTypes]
 */
function getItem(itemId, mode) {
    var itemCount = 0;

    // load items.json
    const fs = require('fs');
    var itemFile = fs.readFileSync('res/items.json', 'utf-8');
    try {
        const itemData = JSON.parse(itemFile);

        // read all groups
        for (var i = 0; i < itemData.groups.length; i++) {
            var itemGroup = itemData.groups[i];

            // only use items in mode
            switch (mode) {
                case "Weapons":
                    if (itemGroup.name !== "Rifles" &&
                        itemGroup.name !== "Pistols" &&
                        itemGroup.name !== "Shotguns" &&
                        itemGroup.name !== "Melee" &&
                        itemGroup.name !== "Bows")
                        continue;
                    break;
                case "Tools":
                    if (itemGroup.name !== "Tools")
                        continue;
                    break;
                case "Consumables":
                    if (itemGroup.name !== "Consumables")
                        continue;
                    break;
                default:
                    break;
            }

            // read all items
            for (var j = 0; j < itemGroup.items.length; j++) {
                var item = itemGroup.items[j];

                // read all variants
                for (var k = 0; k < item.variants.length; k++) {
                    itemCount++;
                    if (itemCount === itemId) {
                        var variant = item.variants[k];

                        // read all ammo types for shootable weapons
                        if (mode           === "Weapons" &&
                            itemGroup.name !== "Melee") {
                            
                            // get ammo count of weapon
                            var ammoCount = 0;
                            for (var l = 0; l < item.ammoTypes.length; l++) {
                                ammoCount++;
                            }

                            var ammoTypes = [];
                            var ammoId;
                            // pick ammo types
                            for (var m = 0; m < item.ammoSlots; m++) {

                                // different logic for LeMat
                                if (item.name === "LeMat Mark II") {
                                    while (true) {
                                        ammoId = Math.floor(Math.random() * ammoCount + 1);
                                        ammoCount = 0;

                                        for (var n = 0; n < item.ammoTypes.length; n++) {
                                            ammoCount++;
                                            if (ammoCount === ammoId) {
                                                ammoTypes[m] = item.ammoTypes[n];
                                            }
                                        }

                                        // find compact ammo
                                        if (m === 0 && ammoTypes[m].type === "Compact" ) {
                                            break;
                                        }

                                        // find shotgun ammo
                                        if (m === 1 && ammoTypes[m].type === "Shotgun" ) {
                                            break;
                                        }
                                    }
                                } else {

                                    ammoId = Math.floor(Math.random() * ammoCount + 1);
                                    ammoCount = 0;

                                    for (var n = 0; n < item.ammoTypes.length; n++) {
                                        ammoCount++;
                                        if (ammoCount === ammoId) {
                                            ammoTypes[m] = item.ammoTypes[n];
                                        }
                                    }
                                }
                            }
                            return [itemGroup, item, variant, ammoTypes];
                        }
                        
                        // return without ammo type for melee weapons
                        return [itemGroup, item, variant];
                    }
                }
            }
        }
    } catch (err) {
        console.log(err);
    }
}