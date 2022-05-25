const fs = require('fs');
require('better-logging')(console);

const { Client, Intents, Collection } = require("discord.js");
const client = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
});
const config = require("./config.json");

// read command files
client.commands = new Collection();

const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));
for(let file of commandFiles) {
    let command = require(`./commands/${file}`);

    client.commands.set(command.name, command);
}

// status message
client.once('ready', () => {
    console.log('Mr. Chary has emerged!');
});

// command handler
client.on('messageCreate', message => {
    if(!message.content.startsWith(config.prefix) || message.author.bot) {
        return;
    }

    let args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    let command = args.shift().toLowerCase();

    switch (command) {
        case 'help':
            client.commands.get('help').execute(message, args);
            break;
        case 'list':
            client.commands.get('list').execute(message, args);
            break;
        case 'random':
            client.commands.get('random').execute(message, args);
            break;
        default:
            client.commands.get('help').execute(message, args);
            break;
    }
});

// login with token
client.login(config.token);
