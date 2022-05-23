
# Mr. Chary

A discord bot for various Hunt: Showdown functions.

## Item Collection

The bot uses the items stored in the `items.json` file.

## Commands

All commands are invoked with `!cry [command] <argument>`

### Available Commands

| command  | arguments                                                     | description                                                       |
|----------|---------------------------------------------------------------|-------------------------------------------------------------------|
| `help`   |                                                               | Prints out a help                                                 |
| `list`   | `-g\|--group`                                                 | Lists all items in the item collection e.g. `!cry list -g=Rifles` |
| `random` | `-fs\|--fill-slots`, `-fm\|--force-melee`, `-fk\|--force-kit` | Generates a random loadout e.g. `!cry random -fs -fm -fk`         |
