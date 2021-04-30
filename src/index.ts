const minimist = require("minimist");
const path = require("path");

//
// https://stackoverflow.com/a/26227660/25868
//
// process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share")

import create from "./commands/create";
import up from "./commands/up";
import deploy from "./commands/deploy";
import build from "./commands/build";

async function main(): Promise<void> {
    const argv = minimist(process.argv.slice(2));

    console.log("HOME: " + process.env.HOME);
    console.log("APPDATA: " + process.env.APPDATA);
    console.log("Platform: " + process.platform);

    if (argv._.length > 0) {
        const cmd = argv._[0];
        if (cmd === "create") {
            await create(argv);
        }
        else if (cmd === "build") {
            await build(argv);
        }
        else if (cmd === "up") {
            await up(argv);
        }
        else if (cmd === "deploy") {
            await up(argv);
        }
        else {
            throw new Error(`Unexpected command ${cmd}`);
        }
    }
}

main()
    .catch(err => {
        console.error(`Failed:`);
        console.error(err);
        process.exit(1);
    });