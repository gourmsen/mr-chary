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
        
        if (primaryWeapon[0].name === 'Melee') {
            embed.addField("Primary Slot", "`" + primaryWeapon[1].name +
            " (" + primaryWeapon[2].name + ")`", false);
        } else {
            embed.addField("Primary Slot", "`" + primaryWeapon[1].name +
            " (" + primaryWeapon[2].name + ")" +
            " (" + primaryWeapon[3].name + " " + primaryWeapon[3].type + " Ammo)`", false);
        }
        if (secondaryWeapon[0].name === 'Melee') {
            embed.addField("Secondary Slot", "`" + secondaryWeapon[1].name +
            " (" + secondaryWeapon[2].name + ")`", false);
        } else {
            embed.addField("Secondary Slot", "`" + secondaryWeapon[1].name +
            " (" + secondaryWeapon[2].name + ")" +
            " (" + secondaryWeapon[3].name + " " + secondaryWeapon[3].type + " Ammo)`", false);
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
 * @returns [itemGroup, item, variant, ammoType]
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

                            // pick ammo type
                            var ammoId = Math.floor(Math.random() * ammoCount + 1);
                            ammoCount = 0;
                            for (var m = 0; m < item.ammoTypes.length; m++) {
                                ammoCount++;
                                if (ammoCount === ammoId) {
                                    var ammoType = item.ammoTypes[m];
                                    return [itemGroup, item, variant, ammoType];
                                }
                            }
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