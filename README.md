### Tippy Coco

Tippy Coco is a volleyball game in the browser. You don't need to install anything to play. Just visit the browser page on a computer or iPad with a keyboard.

It supports:

- 2 players at the same keyboard
- 2 players with gamepads
- 1 player against the bundled opponents

Network play is not possible and won't be supported as (1) that's not fun for a game like this, and (2) this game is too twitchy for any pings higher than LAN play.

### To play

https://tippycoco.com

### To report bugs and suggestions

Please, create a [GitHub issue](/malgorithms/tippycoco/issues) for me.

### To run locally and develop

This should be pretty easy. Let me know in the issues if not.

Prerequisite: `Node.js` installed

- clone this repo, cd into it
- install yarn if you don't have it. `npm install -g yarn`
- run `yarn` to get dependencies
- in one terminal `yarn watch`. This will keep the game and frontend JS built as you edit it
- in another terminal `yarn app`. This will compile the site and host it
- visit `http://localhost:3377` to play the game
- Now, just edit any `*.ts` file in the `src/` dir to insta-change the game
- If you change the site code at all (`site/` dir, kill and restart with `yarn app`)

### Writing a bot

For now, just take a look at any of the existing ones (e.g. `src/ai/green-ai.ts`) and edit that. If you make a good one, I can add it to the game.

Also, during a game if you hit the letter `g` on your keyboard (for *G*od mode), it will show you a rough prediction of where the ball(s) will go, highlighting the likely places they will hit the ground or enter a player's jump range. That same button will unlock all the characters.

### Credits

Game by [Chris Coyne](https://chriscoyne.com). You can follow me on Twitter at [@malgorithms](https://twitter.com/malgorithms). Music by Christian Rudder. "Rejected" sound by Jennie. "Slam" sound by Cameron. "Kiss" by Abbott.
