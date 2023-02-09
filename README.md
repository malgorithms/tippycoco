### Tippy Coco

An HTML-5 canvas game with gamepad support.

### To play

https://tippycoco.com

### To report bugs

Please, create a GitHub issue for me!

### To run locally and develop

Prerequisite: `Node.js` installed

- clone this repo, cd into it
- install yarn if you don't have it. `npm install -g yarn`
- run `yarn` to get dependencies
- in one terminal `yarn webpack -w`. This will keep the game built as you edit it
- in another terminal `yarn app`. This will start the game up.
- visit `http://localhost:3377` to play the game
- Now, just edit any `*.ts` file in the `src/` dir to insta-change the game

### Writing a bot

For now, just take a look at any of the existing ones (e.g. `src/ai/green-ai.ts`) and edit that. If you make a good one, I can add it to the game.

Also, during a game if you hit the letter `g` on your keyboard (for *G*od mode), it will show you a rough prediction of where the ball(s) will go, highlighting the likely places they will hit the ground or enter a player's jump range. That same button will unlock all the characters.

### Credits

Game by [Chris Coyne](https://chriscoyne.com). You can follow me on Twitter at [@malgorithms](https://twitter.com/malgorithms). Music by Christian Rudder. "Rejected" sound by Jennie. "Slam" sound by Cameron. "Kiss" by Abbott.
