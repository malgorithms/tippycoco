"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameState = exports.Game = void 0;
const ball_1 = require("./ball");
const color_1 = require("./color");
const constants_1 = __importDefault(require("./constants"));
const content_loader_1 = require("./content-loader");
const display_1 = require("./display");
const future_prediction_1 = require("./future-prediction");
const history_manager_1 = require("./history-manager");
const input_1 = require("./input");
const kapow_manager_1 = require("./kapow-manager");
const menu_1 = require("./menu");
const player_1 = require("./player");
const sound_manager_1 = require("./sound-manager");
const tweakables_1 = __importDefault(require("./tweakables"));
const types_1 = require("./types");
Object.defineProperty(exports, "GameState", { enumerable: true, get: function () { return types_1.GameState; } });
const utils_1 = require("./utils");
const persistence_1 = require("./persistence");
const ai_1 = require("./ai/ai");
const rectangular_obstacle_1 = require("./rectangular-obstacle");
class Game {
    content;
    display;
    input;
    menu;
    history = new history_manager_1.HistoryManager();
    isGamePoint = false;
    scoreLeftPlayer = 0;
    scoreRightPlayer = 0;
    whoseServe = types_1.PlayerSide.Left;
    gameState = types_1.GameState.PreStart;
    currentGameTime = this.emptyGameTime();
    futurePredictionList = [];
    lastFuturePrediction = 0;
    fpsTimer = new Array();
    players = new Map();
    balls = [];
    net = new rectangular_obstacle_1.RectangularObstacle(tweakables_1.default.net);
    leftWall = new rectangular_obstacle_1.RectangularObstacle(tweakables_1.default.leftWall);
    rightWall = new rectangular_obstacle_1.RectangularObstacle(tweakables_1.default.rightWall);
    invisibleFloor = new rectangular_obstacle_1.RectangularObstacle(tweakables_1.default.invisibleFloor);
    sound;
    kapow = new kapow_manager_1.KapowManager();
    accumulatedGamePlayTime = 0; // How much the clock has run this game, in seconds, excluding pauses and between points
    accumulatedStateSeconds = 0; // Time accumulated since last gamestate change
    accumulatedPointSeconds = 0; // Accumulated play time this point (persists even if pausing it to go to menu)
    whenStartedDateTime = Date.now();
    constructor(targetDiv, contentLoadMonitor) {
        this.content = new content_loader_1.ContentLoader(contentLoadMonitor);
        this.generatePlayers(null);
        this.generateBalls(2);
        this.resetScores();
        this.init(targetDiv);
    }
    async init(targetDiv) {
        this.sound = new sound_manager_1.SoundManager(this.content);
        this.display = new display_1.Display(this, this.content, targetDiv);
        this.menu = new menu_1.Menu(this.display);
        this.input = new input_1.Input(this);
        await this.loadContent();
        this.resetScores();
        this.display.atmosphere.changeSkyForOpponent(this.playerRight, 1);
        this.setGameState(types_1.GameState.PreStart);
        this.futurePredictionList = [];
        for (let i = 0; i < this.balls.length; i++) {
            this.futurePredictionList.push(new future_prediction_1.FuturePrediction());
        }
    }
    player(playerSide) {
        const p = this.players.get(playerSide);
        if (!p)
            throw new Error(`Pfff, player could not load`);
        return p;
    }
    get playerLeft() {
        return this.player(types_1.PlayerSide.Left);
    }
    getScore(playerSide) {
        return playerSide === types_1.PlayerSide.Left ? this.scoreLeftPlayer : this.scoreRightPlayer;
    }
    get playerRight() {
        return this.player(types_1.PlayerSide.Right);
    }
    get isTwoPlayerGame() {
        return this.playerRight.species === player_1.PlayerSpecies.Human;
    }
    generateBalls(numBalls) {
        this.balls = [];
        for (let i = 0; i < numBalls; i++) {
            let ballArg = tweakables_1.default.ball.defaultSettings(i);
            if (this.playerRight.ai instanceof ai_1.ais.Gray)
                ballArg = tweakables_1.default.ball.tennisSettings();
            this.balls.push(new ball_1.Ball(ballArg));
        }
    }
    emptyGameTime() {
        return {
            totalGameTime: {
                totalMilliseconds: 0,
                totalSeconds: 0,
            },
            elapsedGameTime: {
                totalMilliseconds: 0,
                totalSeconds: 0,
            },
        };
    }
    generatePlayers(rightPlayerAi) {
        const pLeftConfig = tweakables_1.default.player.defaultSettings(types_1.PlayerSide.Left);
        const pRightConfig = tweakables_1.default.player.defaultSettings(types_1.PlayerSide.Right);
        if (rightPlayerAi) {
            pRightConfig.species = player_1.PlayerSpecies.Ai;
            pRightConfig.ai = rightPlayerAi;
        }
        this.players.set(types_1.PlayerSide.Left, new player_1.Player(pLeftConfig));
        this.players.set(types_1.PlayerSide.Right, new player_1.Player(pRightConfig));
    }
    async run() {
        while (!this.content.isLoaded) {
            await (0, utils_1.timeout)(100);
        }
        this.whenStartedDateTime = Date.now();
        this.display.initialDraw();
        await this.runLoop();
    }
    updateFps() {
        this.fpsTimer.push(Date.now());
        if (this.fpsTimer.length > tweakables_1.default.fpsSampleCount) {
            this.fpsTimer.splice(0, 1);
        }
    }
    getCurrentFps() {
        const len = this.fpsTimer.length;
        return len <= 1 ? 0 : 1000 / ((this.fpsTimer[len - 1] - this.fpsTimer[0]) / len);
    }
    async runLoop() {
        const startTime = Date.now();
        let overshotAdj = 0;
        let lastDraw = Date.now();
        let lastTime = Date.now();
        while (this.gameState !== types_1.GameState.Exit) {
            this.input.updateInputStates();
            await (0, utils_1.timeout)(constants_1.default.gameLoopDelayMs);
            const currTime = Date.now();
            let dt = currTime - lastTime;
            if (dt > tweakables_1.default.maxDtMs && Date.now() - startTime > 1000) {
                const extra = dt - tweakables_1.default.maxDtMs;
                console.log(`gameTime adj by -${dt}ms due to browser JS pause`);
                dt = tweakables_1.default.maxDtMs;
                overshotAdj += extra;
            }
            const totalMs = currTime - startTime - overshotAdj;
            this.currentGameTime = {
                totalGameTime: {
                    totalMilliseconds: totalMs,
                    totalSeconds: totalMs / 1000,
                },
                elapsedGameTime: {
                    totalMilliseconds: dt,
                    totalSeconds: dt / 1000,
                },
            };
            this.update(this.currentGameTime);
            if (Date.now() - lastDraw > tweakables_1.default.redrawTargetMs) {
                this.updateFps();
                this.draw(this.currentGameTime);
                lastDraw = Date.now();
            }
            lastTime = currTime;
        }
    }
    getGameState() {
        return this.gameState;
    }
    setGameState(gs) {
        this.sound.fadeGrowthNoise(types_1.PlayerSide.Left);
        this.sound.fadeGrowthNoise(types_1.PlayerSide.Right);
        if (gs !== this.gameState)
            this.accumulatedStateSeconds = 0.0;
        this.gameState = gs;
        if (gs === types_1.GameState.PreAction) {
            this.sound.play('launch', 0.25, 0.5, 0, false);
            this.setUpForServe();
        }
        if (gs === types_1.GameState.MainMenu ||
            gs === types_1.GameState.Paused ||
            gs === types_1.GameState.PreExitMessage ||
            gs === types_1.GameState.PreExitCredits ||
            gs === types_1.GameState.Intro1 ||
            gs === types_1.GameState.Intro2 ||
            gs === types_1.GameState.Intro3 ||
            gs === types_1.GameState.Victory) {
            this.sound.playIfNotPlaying('themeSong', 1.0, 0.0, 0.0, true);
        }
        else if (gs !== types_1.GameState.PreStart) {
            this.sound.stopIfPlaying('themeSong');
        }
        if (gs === types_1.GameState.Action && !this.isGamePoint) {
            this.sound.playIfNotPlaying('gamePlayMusic', 0.5, 0.0, 0.0, true);
        }
        else if (gs === types_1.GameState.Paused || gs === types_1.GameState.AutoPaused) {
            this.sound.stopIfPlaying('gamePlayMusic');
        }
    }
    async loadContent() {
        const contentStartTime = Date.now();
        console.log(`Starting to load content`);
        await Promise.all([this.sound.loadContent(), this.display.loadContent()]);
        console.log(`Finished loading content ${Date.now() - contentStartTime}ms`);
    }
    getPlayerNickname(playerSide) {
        if (playerSide === types_1.PlayerSide.Left)
            return 'Red';
        if (this.playerRight.species === player_1.PlayerSpecies.Human)
            return 'Blue';
        else if (this.playerRight.ai) {
            return (0, ai_1.aiToNickname)(this.playerRight.ai);
        }
        else {
            return 'Unknown';
        }
    }
    draw(gameTime) {
        const dt = gameTime.elapsedGameTime.totalSeconds;
        this.kapow.step(dt);
        this.display.draw(gameTime, this.gameState, this.scoreLeftPlayer, this.scoreRightPlayer, this.futurePredictionList, this.kapow, this.getCurrentFps(), this.input.gamepadConnectSummary());
        if (this.gameState === types_1.GameState.Victory) {
            this.isGamePoint = false;
            const seconds = this.accumulatedGamePlayTime;
            const minutesInt = Math.floor(seconds / 60.0);
            const time = minutesInt > 0 ? `${minutesInt} min ${seconds.toFixed(3)} sec` : `${seconds.toFixed(3)} seconds`;
            const winner = this.scoreLeftPlayer > this.scoreRightPlayer ? types_1.PlayerSide.Left : types_1.PlayerSide.Right;
            const summ = winner === types_1.PlayerSide.Right && this.playerRight.ai ? `Defeat in ${time}.` : `Victory in ${time}.`;
            const wPlayer = winner === types_1.PlayerSide.Right ? this.playerRight : this.playerLeft;
            if (wPlayer.jumpCount === 0) {
                this.display.drawCenteredDancingMessage(gameTime, 'Without Jumping!!!', summ, color_1.Colors.white);
            }
            else if (this.scoreLeftPlayer === 0 || this.scoreRightPlayer === 0) {
                this.display.drawCenteredDancingMessage(gameTime, 'Shutout!', summ, color_1.Colors.white);
            }
            else {
                this.display.drawCenteredDancingMessage(gameTime, this.getPlayerNickname(winner) + ' Wins!', summ, color_1.Colors.white);
            }
        }
        if (this.gameState === types_1.GameState.PointScored) {
        }
        else if (this.gameState === types_1.GameState.Paused) {
            this.menu.draw(true, gameTime);
        }
        else if (this.gameState === types_1.GameState.MainMenu) {
            this.menu.draw(false, gameTime);
        }
        else if (this.gameState === types_1.GameState.PreExitCredits)
            this.display.drawCredits(gameTime);
    }
    startNewGame(numBalls, ai) {
        this.resetScores();
        this.generatePlayers(ai);
        this.whoseServe = ai || Math.random() < 0.5 ? types_1.PlayerSide.Left : types_1.PlayerSide.Right;
        this.setGameState(types_1.GameState.PreAction);
        const aiName = ai ? (0, ai_1.aiToName)(ai) : undefined;
        persistence_1.persistence.incGamesStarted(numBalls, this.playerRight.species, aiName);
        this.accumulatedGamePlayTime = 0.0;
        this.generateBalls(numBalls);
        this.setUpForServe();
        this.display.atmosphere.changeSkyForOpponent(this.playerRight, 1);
    }
    handlePreExitInputs() {
        let stepForward = false;
        for (let i = 1; i <= 4; i++) {
            if (this.input.wasMenuSelectJustPushed(null).selected) {
                stepForward = true;
            }
        }
        if (stepForward && this.gameState === types_1.GameState.PreExitCredits)
            this.setGameState(types_1.GameState.Exit);
        else if (stepForward)
            this.setGameState(types_1.GameState.PreExitCredits);
    }
    handleIntroInputs() {
        let stepForward = false;
        for (let i = 1; i <= 4; i++) {
            if (this.input.wasMenuSelectJustPushed(null).selected || this.accumulatedStateSeconds > 3) {
                if (Date.now() - this.whenStartedDateTime > 250) {
                    stepForward = true;
                }
            }
        }
        if (stepForward && this.gameState === types_1.GameState.Intro1)
            this.setGameState(types_1.GameState.Intro2);
        else if (stepForward && this.gameState === types_1.GameState.Intro2)
            this.setGameState(types_1.GameState.Intro3);
        else if (stepForward)
            this.setGameState(types_1.GameState.MainMenu);
    }
    handleAutoPausedInputs() {
        // Exit this state if controller reconnected
        if (this.input.doesPlayerHaveGamepad(types_1.PlayerSide.Left) &&
            (this.playerRight.species !== player_1.PlayerSpecies.Human || this.input.doesPlayerHaveGamepad(types_1.PlayerSide.Right))) {
            // Remove menu ownership
            this.menu.setWhoOwnsMenu(null);
            // Go to paused menu
            this.setGameState(types_1.GameState.Paused);
            this.menu.select(menu_1.MenuAction.ReturnToGame, types_1.PlayerSide.Left);
        }
    }
    handleMenuInputs() {
        const owner = this.menu.getWhoOwnsMenu();
        const menuSelectResult = this.input.wasMenuSelectJustPushed(owner);
        if (this.input.wasMenuRightJustPushed(owner))
            this.menu.moveRight(owner);
        else if (this.input.wasMenuLeftJustPushed(owner))
            this.menu.moveLeft(owner);
        else if (this.input.wasMenuDownJustPushed(owner))
            this.menu.moveDown(owner);
        else if (this.input.wasMenuUpJustPushed(owner))
            this.menu.moveUp(owner);
        if (menuSelectResult.selected && !this.menu.isOnLockedSelection()) {
            const gamepadSide = menuSelectResult.byPlayerSide;
            const entry = this.menu.selectedEntry;
            const action = entry.action;
            if (action === menu_1.MenuAction.Play) {
                const numBalls = entry.numBalls ?? 1;
                if (!entry.ai) {
                    this.startNewGame(numBalls, null);
                }
                else {
                    if (gamepadSide === types_1.PlayerSide.Right) {
                        this.input.swapGamepadSides();
                    }
                    this.startNewGame(numBalls, new entry.ai(this));
                }
            }
            else if (action === menu_1.MenuAction.Exit)
                this.setGameState(types_1.GameState.PreExitMessage);
            else if (action === menu_1.MenuAction.ReturnToGame)
                this.setGameState(types_1.GameState.Action);
        }
        // Pressing B or Start from Pause returns to Game
        if (this.gameState === types_1.GameState.Paused) {
            if (this.input.wasMenuExitJustPushed(owner))
                this.setGameState(types_1.GameState.Action);
        }
    }
    handleVictoryInputs() {
        if (this.accumulatedStateSeconds > 1.0 && this.input.wasPostgameProceedJustPushed()) {
            this.setGameState(types_1.GameState.MainMenu);
        }
    }
    handlePostPointInputs(dt) {
        // we can let them move for a min
        if (this.accumulatedStateSeconds < tweakables_1.default.afterPointKeepMovingSec) {
            this.handleActionInputsForPlayer(dt, types_1.PlayerSide.Left);
            this.handleActionInputsForPlayer(dt, types_1.PlayerSide.Right);
        }
    }
    handlePreActionInputs() {
        if (this.accumulatedStateSeconds > tweakables_1.default.preServeDelaySec) {
            this.setGameState(types_1.GameState.Action);
        }
    }
    pauseTheGame(playerSide) {
        this.menu.setWhoOwnsMenu(playerSide);
        this.setGameState(types_1.GameState.Paused);
        this.menu.select(menu_1.MenuAction.ReturnToGame, playerSide);
    }
    // we wait shortly after the ball to launch them
    launchPlayersWithGoodTiming() {
        const stateSec = this.accumulatedStateSeconds;
        const jumpDelay = tweakables_1.default.player.afterPointJumpDelay;
        if (stateSec < jumpDelay) {
            this.playerLeft.physics.center.y = -this.playerLeft.physics.diameter - this.balls[0].physics.diameter;
            this.playerRight.physics.center.y = -this.playerRight.physics.diameter - this.balls[0].physics.diameter;
        }
        else if (stateSec >= jumpDelay &&
            this.playerLeft.physics.center.y < -this.playerLeft.physics.radius &&
            this.playerLeft.physics.vel.y <= 0) {
            this.playerLeft.physics.vel.y = tweakables_1.default.player.jumpSpeedAfterPoint;
            this.playerRight.physics.vel.y = tweakables_1.default.player.jumpSpeedAfterPoint;
        }
    }
    arePlayersHighEnoughToMove() {
        return (this.playerLeft.physics.center.y >= -this.playerLeft.physics.radius &&
            this.playerRight.physics.center.y >= -this.playerRight.physics.radius);
    }
    handleActionInputs(dt) {
        if (this.arePlayersHighEnoughToMove()) {
            this.handleActionInputsForPlayer(dt, types_1.PlayerSide.Left);
            this.handleActionInputsForPlayer(dt, types_1.PlayerSide.Right);
        }
        // AUTO-PAUSING
        if (this.input.wasPlayerJustDisconnectedFromGamepad(types_1.PlayerSide.Left)) {
            this.setGameState(types_1.GameState.AutoPaused);
        }
        else if (this.playerRight.species === player_1.PlayerSpecies.Human && this.input.wasPlayerJustDisconnectedFromGamepad(types_1.PlayerSide.Right)) {
            this.setGameState(types_1.GameState.AutoPaused);
        }
        // REGULAR PAUSING
        if (this.input.wasKeyboardPauseHit()) {
            this.pauseTheGame(null);
        }
        else {
            const padCheckPlayerSide = this.input.checkGamepadPauseHit();
            if (padCheckPlayerSide !== null) {
                this.pauseTheGame(padCheckPlayerSide);
            }
        }
    }
    getDashDir(player) {
        const dSq = (b) => utils_1.vec.distSq(b.physics.center, player.physics.center);
        const ballsClosests = this.balls.concat([]).sort((b1, b2) => dSq(b1) - dSq(b2));
        return utils_1.vec.sub(ballsClosests[0].physics.center, player.physics.center);
        //return this.input.getXyDirectional(playerSide)
    }
    handleActionInputsForPlayer(dt, playerSide) {
        const player = this.player(playerSide);
        if (player.species === player_1.PlayerSpecies.Human) {
            player.targetXVel = player.isDashing ? player.physics.vel.x : 0;
            // the following is -1...1 and maps to 0 if near the center, as determined
            // in tweakables.thumbstickCenterTolerance
            const thumbstickPos = this.input.getLeftThumbStickX(playerSide);
            if (!player.isDashing) {
                if (this.input.isLeftPressed(playerSide))
                    player.moveLeft();
                else if (this.input.isRightPressed(playerSide))
                    player.moveRight();
                else if (thumbstickPos)
                    player.moveRationally(thumbstickPos);
                if (player.canDashNow && this.input.wasDashJustPushed(playerSide)) {
                    const dashDir = this.getDashDir(player);
                    player.dash(dashDir);
                    this.sound.play('dash', 1, 0, 0, false);
                }
                else if (player.isInJumpPosition && this.input.isJumpPressed(playerSide))
                    player.jump();
            }
            // triggers only register over some threshold as dtermined in tweakables.triggerTolerance
            const lTrigger = this.input.getTrigger(playerSide, 'left');
            const rTrigger = this.input.getTrigger(playerSide, 'right');
            const triggerDiff = rTrigger - lTrigger;
            const amSmall = player.physics.diameter === tweakables_1.default.player.minDiameter;
            const amBig = player.physics.diameter === tweakables_1.default.player.maxDiameter;
            if (triggerDiff) {
                player.grow(dt, triggerDiff * tweakables_1.default.input.triggerGrowthMult);
                if (!amSmall && !amBig)
                    this.sound.playGrowthNoise(playerSide, triggerDiff);
            }
            else if (!amSmall && this.input.isShrinkPressed(playerSide)) {
                player.grow(dt, -tweakables_1.default.keyboardGrowthRate);
                this.sound.playGrowthNoise(playerSide, -tweakables_1.default.keyboardGrowthRate);
            }
            else if (!amBig && this.input.isGrowPressed(playerSide)) {
                player.grow(dt, tweakables_1.default.keyboardGrowthRate);
                this.sound.playGrowthNoise(playerSide, tweakables_1.default.keyboardGrowthRate);
            }
            else {
                this.sound.fadeGrowthNoise(playerSide);
            }
        }
    }
    canPlayerJump(player, opponent) {
        if (this.accumulatedStateSeconds < tweakables_1.default.ballPlayerLaunchTime)
            return false;
        else if (player.physics.vel.y > player.maxVel.y / 2)
            return false;
        else if (player.isOnHeight(0.0))
            return true;
        else if (player.isOnRectangle(this.net))
            return true;
        else if (player.isOnPlayer(opponent))
            return true;
        else
            return false;
    }
    isInDashPosition(player, opponent) {
        // for now dashing is off. It kind of stinks!
        if (!tweakables_1.default.allowDashing)
            return false;
        if (player.isDashing)
            return false;
        if (this.accumulatedStateSeconds < tweakables_1.default.ballPlayerLaunchTime)
            return false;
        else if (player.isOnHeight(0.0))
            return false;
        else if (player.isOnRectangle(this.net))
            return true;
        else if (player.isOnPlayer(opponent))
            return true;
        else
            return true;
    }
    aIStep() {
        for (const p of [this.playerLeft, this.playerRight]) {
            if (p.species === player_1.PlayerSpecies.Ai) {
                const aiThinkArg = {
                    gameTime: this.currentGameTime,
                    accumulatedPointSeconds: this.accumulatedPointSeconds,
                    balls: this.balls,
                    ballPredictions: this.futurePredictionList,
                    gameGravity: tweakables_1.default.gameGravity,
                    p0Score: this.scoreLeftPlayer,
                    p1Score: this.scoreRightPlayer,
                    me: p,
                    opponent: p.playerSide === types_1.PlayerSide.Left ? this.playerRight : this.playerLeft,
                    net: this.net,
                };
                p.ai?.think(aiThinkArg);
            }
        }
    }
    get serveFrom() {
        return tweakables_1.default.courtWidth / 4;
    }
    setUpForServe() {
        this.accumulatedPointSeconds = 0.0;
        const playerL = this.playerLeft;
        const playerR = this.playerRight;
        playerL.physics.center = { x: -this.serveFrom, y: -playerL.physics.diameter - this.balls[0].physics.diameter };
        playerL.physics.vel = { x: 0, y: 0 };
        playerL.targetXVel = 0.0;
        playerR.physics.center = { x: this.serveFrom, y: -playerR.physics.diameter - this.balls[0].physics.diameter };
        playerR.physics.vel = { x: 0, y: 0 };
        playerR.targetXVel = 0.0;
        this.balls[0].physics.center = {
            x: this.whoseServe === types_1.PlayerSide.Left ? -this.serveFrom : this.serveFrom,
            y: -this.balls[0].physics.radius,
        };
        this.balls[0].physics.vel = { x: 0, y: this.balls[0].maxSpeed };
        this.balls[0].physics.angularVel = 0;
        this.balls[0].physics.orientation = 0;
        if (this.balls[1]) {
            this.balls[1].physics.center = {
                x: this.whoseServe === types_1.PlayerSide.Left ? this.serveFrom : -this.serveFrom,
                y: -this.balls[1].physics.radius * 1.1,
            };
            this.balls[1].physics.vel = { x: 0, y: this.balls[1].maxSpeed };
            this.balls[1].physics.angularVel = 0;
            this.balls[0].physics.orientation = 0;
        }
    }
    resetScores() {
        this.scoreLeftPlayer = 0;
        this.scoreRightPlayer = 0;
    }
    pointExplosion(b) {
        for (const p of this.players.values()) {
            this.explodeAwayFrom(p.physics, b.physics.center);
        }
        for (const otherB of this.balls) {
            if (otherB !== b) {
                this.explodeAwayFrom(otherB.physics, b.physics.center);
            }
        }
    }
    explodeAwayFrom(c, p) {
        const fDir = utils_1.vec.normalized(utils_1.vec.sub(c.center, p));
        const velDelta = utils_1.vec.scale(fDir, tweakables_1.default.physics.explosionVelDelta);
        c.vel.x += velDelta.x;
        c.vel.y += velDelta.y;
    }
    checkForAndScorePoint() {
        let pointForPlayer = null;
        if (this.accumulatedPointSeconds < tweakables_1.default.ballPlayerLaunchTime)
            return false;
        for (const b of this.balls) {
            const didHit = this.invisibleFloor.handleBallCollision(b.physics, tweakables_1.default.physics.ballFloorElasticity, false);
            if (didHit) {
                pointForPlayer = b.physics.center.x > this.net.center.x ? types_1.PlayerSide.Left : types_1.PlayerSide.Right;
                this.kapow.addAKapow('kapowScore', b.physics.center, Math.random() / 10, 0.4, 0.5);
                // increase the pitch on each point
                //const pitch = Math.max(1, this.getScore(pointForPlayer) / 5)
                //this.sound.play('pointScored', 0.8, pitch, b.physics.center.x, false)
                this.sound.play('chaChing', 0.8, 0, 0, false);
                this.pointExplosion(b);
            }
        }
        if (pointForPlayer)
            this.handlePointScored(pointForPlayer);
        if (this.gameState === types_1.GameState.PointScored &&
            this.scoreLeftPlayer !== this.scoreRightPlayer &&
            (this.scoreLeftPlayer >= tweakables_1.default.winningScore - 1 || this.scoreRightPlayer >= tweakables_1.default.winningScore - 1)) {
            this.sound.stopIfPlaying('gamePlayMusic');
            this.isGamePoint = true;
            this.sound.playIfNotPlaying('gamePoint', 0.6, 0.0, 0.0, false);
            this.display.atmosphere.changeSkyForOpponent(this.playerRight, 0);
        }
        else if (pointForPlayer) {
            this.display.atmosphere.changeSkyForOpponent(this.playerRight, 1);
        }
        return !!pointForPlayer;
    }
    handlePointScored(playerSide) {
        const winScore = tweakables_1.default.winningScore;
        this.display.bounceScoreCard(playerSide);
        const sec = this.accumulatedGamePlayTime;
        const jumps = this.playerLeft.jumpCount;
        this.setGameState(types_1.GameState.PointScored);
        if (playerSide === types_1.PlayerSide.Left) {
            this.scoreLeftPlayer++;
            if (this.scoreLeftPlayer >= winScore && this.scoreLeftPlayer - this.scoreRightPlayer >= 2) {
                persistence_1.persistence.incGamesCompleted();
                if (this.playerRight.ai) {
                    const aiName = (0, ai_1.aiToName)(this.playerRight.ai);
                    const wasShutout = this.scoreRightPlayer === 0;
                    persistence_1.persistence.recordResultAgainstAi(aiName, true, wasShutout, sec, jumps);
                }
                this.setGameState(types_1.GameState.Victory);
            }
            this.whoseServe = types_1.PlayerSide.Left;
        }
        else {
            this.scoreRightPlayer++;
            if (this.scoreRightPlayer >= winScore && this.scoreRightPlayer - this.scoreLeftPlayer >= 2) {
                persistence_1.persistence.incGamesCompleted();
                if (this.playerRight.ai) {
                    const aiName = (0, ai_1.aiToName)(this.playerRight.ai);
                    persistence_1.persistence.recordResultAgainstAi(aiName, false, false, sec, jumps);
                }
                this.setGameState(types_1.GameState.Victory);
            }
            this.whoseServe = types_1.PlayerSide.Right;
        }
    }
    // keeps balls within the flowers; this is a simple/fast solution
    // to the problem of a multi-object pileup that could otherwise push them through.
    // Also, if we were to allow a y-velocity so high they could go over the flowers,
    // this would keep them inside.
    constrainBalls() {
        for (const b of this.balls) {
            const { x, y } = b.physics.center;
            const r = b.physics.radius;
            if (x - r < this.leftWall.x2) {
                b.physics.center.x = this.leftWall.x2 + r;
            }
            if (x + r > this.rightWall.x1) {
                b.physics.center.x = this.rightWall.x1 - r;
            }
            if (y - r < this.invisibleFloor.y2) {
                b.physics.center.y = this.invisibleFloor.y2 + r;
            }
        }
    }
    //
    // Keeps players constrained by floor and walls
    //
    constrainPlayers() {
        const wallBorder = tweakables_1.default.courtWidth / 2;
        for (const p of this.players.values()) {
            // Constrain Player to Floor. In the first second of the game they float up from it. After that they stick above it.
            if (this.accumulatedPointSeconds > tweakables_1.default.ballPlayerLaunchTime && p.physics.center.y < 0.0) {
                p.physics.center.y = 0.0;
                if (p.physics.vel.y < 0)
                    p.physics.vel.y = 0;
            }
            // Left Wall
            if (p.physics.center.x < -wallBorder + p.physics.diameter / 2) {
                p.physics.center.x = -wallBorder + p.physics.diameter / 2;
                if (p.physics.vel.x < 0)
                    p.physics.vel.x = 0.0;
            }
            // Right Wall
            if (p.physics.center.x > wallBorder - p.physics.diameter / 2) {
                p.physics.center.x = wallBorder - p.physics.diameter / 2;
                if (p.physics.vel.x > 0)
                    p.physics.vel.x = 0.0;
            }
        }
    }
    manageCollisions(isSimulation) {
        const ball0 = this.balls[0];
        const ball1 = this.balls[1];
        const playerL = this.playerLeft;
        const playerR = this.playerRight;
        // Balls with net, walls, even the floor
        for (const b of this.balls) {
            if (this.leftWall.handleBallCollision(b.physics, 1.0, isSimulation) && !isSimulation) {
                this.sound.playIfNotPlaying(b.bounceOffFlowerSoundName, 0.6, 0.0, -0.5, false);
            }
            if (this.rightWall.handleBallCollision(b.physics, 1.0, isSimulation) && !isSimulation)
                this.sound.playIfNotPlaying('bounceFlower', 0.6, 0.0, 0.5, false);
            if (this.net.handleBallCollision(b.physics, 1.0, isSimulation) && !isSimulation) {
                this.sound.playIfNotPlaying(b.bounceOffFlowerSoundName, 0.3, 0.0, 0.0, false);
            }
            if (this.gameState !== types_1.GameState.Action || this.accumulatedPointSeconds > tweakables_1.default.timeOnServeFloorDisappears) {
                if (this.invisibleFloor.handleBallCollision(b.physics, tweakables_1.default.physics.ballFloorElasticity, isSimulation)) {
                    if (!isSimulation) {
                        //console.log(this.gameState, this.accumulatedStateSeconds)
                    }
                }
            }
        }
        // Balls with other balls
        if (ball0 && ball1) {
            const collision = ball0.physics.handleHittingOtherCircle(ball1.physics, 1, isSimulation);
            if (collision.didCollide && !isSimulation) {
                const hardness = Math.min(1, utils_1.vec.len(collision.c2MomentumDelta) / ball0.physics.mass / 5.0);
                const pan = collision.pointOfContact.x;
                const pitch = 0.5;
                this.sound.playIfNotPlaying(ball0.bounceSoundName, hardness, pitch, pan, false);
            }
        }
        // Players with net
        this.net.handleBallCollision(playerL.physics, 0.0, isSimulation);
        this.net.handleBallCollision(playerR.physics, 0.0, isSimulation);
        // Players with balls
        for (const b of this.balls) {
            this.manageBallPlayerCollision(isSimulation, b, playerL, types_1.PlayerSide.Left);
            this.manageBallPlayerCollision(isSimulation, b, playerR, types_1.PlayerSide.Right);
        }
        // Player-player collisions
        playerL.physics.handleHittingOtherCircle(playerR.physics, 0.0, isSimulation);
    }
    manageBallPlayerCollision(isSimulation, ball, player, playerSide) {
        const collision = player.physics.handleHittingOtherCircle(ball.physics, tweakables_1.default.physics.ballPlayerElasticity, isSimulation);
        const isLeft = playerSide === types_1.PlayerSide.Left;
        if (!collision.didCollide || isSimulation)
            return;
        const hardness = Math.min(1, utils_1.vec.len(collision.c2MomentumDelta) / ball.physics.mass / 5.0);
        const pan = collision.pointOfContact.x;
        const range = tweakables_1.default.sound.normalBumpPitchRange;
        const pitch = range -
            (2 * range * (player.physics.diameter - tweakables_1.default.player.minDiameter)) /
                (tweakables_1.default.player.maxDiameter - tweakables_1.default.player.minDiameter);
        this.sound.playIfNotPlaying(ball.bounceSoundName, hardness, pitch, pan, false);
        // Slam
        let amINearnet = false;
        if (player.physics.center.x > this.net.center.x - (3 * this.net.width) / 2 &&
            player.physics.center.x < this.net.center.x + (3 * this.net.width) / 2)
            amINearnet = true;
        let amIHittingItDown = false;
        if ((isLeft && ball.physics.vel.x > 0 && ball.physics.vel.y < 0) || (!isLeft && ball.physics.vel.x < 0 && ball.physics.vel.y < 0))
            amIHittingItDown = true;
        let amIHighEnough = false;
        if (player.physics.center.y > player.getMaxJumpHeight() / 2)
            amIHighEnough = true;
        if (amINearnet &&
            amIHittingItDown &&
            amIHighEnough &&
            !this.history.hasHappenedRecently(`Kapow-Slam-Player-${isLeft ? 0 : 1}`, this.currentGameTime, 0.75)) {
            this.sound.play('slam', 0.3, 0.0, pan, false);
            const dest = utils_1.vec.add(collision.pointOfContact, { x: 0, y: 2 * ball.physics.diameter });
            this.kapow.addAKapow('kapowSlam', dest, 0.0, 0.3, 1.5);
            this.history.recordEvent(`Kapow-Slam-Player-${isLeft ? 0 : 1}`, this.currentGameTime);
        }
        // Rejection
        else if (hardness > 0.1 &&
            ball.physics.vel.y > 1.0 &&
            this.history.hasHappenedRecently(`Kapow-Slam-Player-${isLeft ? 1 : 0}`, this.currentGameTime, 0.5) &&
            !this.history.hasHappenedRecently(`Kapow-Rejected-Player-${isLeft ? 0 : 1}`, this.currentGameTime, 0.25)) {
            this.sound.playIfNotPlaying('rejected', 0.4, 0.1, 0.0, false);
            this.kapow.addAKapow('kapowRejected', collision.pointOfContact, 0.0, 0.3, 1.5);
            this.history.recordEvent(`Kapow-Rejected-Player-${isLeft ? 0 : 1}`, this.currentGameTime);
        }
    }
    /**
     * after a point, we let things move for another moment or two, so it all doesn't just freeze.
     * Then we freeze for a second and launch everything back into its hole. Once everything is back
     * underground, we switch the state to PreAction, where the serve is launched.
     */
    postPointStep(dt) {
        // if everything is back underground, we can proceed to the next step
        if (this.playerLeft.physics.center.y < -this.playerLeft.physics.radius &&
            this.playerRight.physics.center.y < -this.playerRight.physics.radius &&
            this.balls[0].physics.center.y < -this.balls[0].physics.diameter &&
            (!this.balls[1] || this.balls[1].physics.center.y < -this.balls[1].physics.diameter)) {
            this.setGameState(types_1.GameState.PreAction);
        }
        // just let things move for a bit
        else if (this.accumulatedStateSeconds < tweakables_1.default.afterPointKeepMovingSec) {
            this.runActionOrPostPointState();
        }
        // launch things back towards the start
        else if (this.accumulatedStateSeconds < tweakables_1.default.afterPointKeepMovingSec + tweakables_1.default.afterPointFreezeSec) {
            for (const ball of this.balls) {
                ball.physics.vel = { x: 0, y: ball.maxSpeed };
            }
            for (const p of this.players.values()) {
                p.physics.vel.x = 0.0;
                p.physics.vel.y = tweakables_1.default.player.jumpSpeedAfterPoint;
            }
        }
        // Only move it after that
        else {
            const isTwoBallGame = !!this.balls[1];
            // we launch the balls into the air, and we need to know how long until they are underground
            const timeTillBallUnderground = (b) => {
                const v0 = b.physics.vel.y;
                const c = b.physics.center.y + b.physics.diameter;
                const a = tweakables_1.default.gameGravity.y;
                return (-v0 - Math.sqrt(v0 * v0 - 2 * a * c)) / a;
            };
            const timeTillDone = Math.max(timeTillBallUnderground(this.balls[0]), isTwoBallGame ? timeTillBallUnderground(this.balls[1]) : 0.01);
            for (let i = 0; i < 2; i++) {
                const ball = this.balls[i];
                if (ball) {
                    ball.stepVelocity(dt, 1.5, false);
                    let xDestination = this.whoseServe === types_1.PlayerSide.Left ? -this.serveFrom : this.serveFrom;
                    if (isTwoBallGame)
                        xDestination = this.serveFrom - 2 * this.serveFrom * i;
                    const xDistance = xDestination - ball.physics.center.x;
                    ball.physics.vel.x = (3 * xDistance) / timeTillDone;
                    ball.stepPositionAndOrientation(dt);
                }
            }
            for (const player of this.players.values()) {
                const xDestination = player.playerSide === types_1.PlayerSide.Left ? -this.serveFrom : this.serveFrom;
                const xDistance = xDestination - player.physics.center.x;
                player.stepVelocity(dt);
                if (player.physics.center.y < -player.physics.radius) {
                    player.physics.center.y = -player.physics.diameter - this.balls[0].physics.radius;
                }
                else {
                    player.physics.vel.x = (3 * xDistance) / timeTillDone;
                    player.stepPosition(dt);
                }
            }
        }
    }
    gameStep(dt) {
        const isSimulation = this.gameState !== types_1.GameState.Action;
        this.accumulatedGamePlayTime += dt;
        for (const player of this.players.values()) {
            const opponent = player === this.playerLeft ? this.playerRight : this.playerLeft;
            player.stepVelocity(dt);
            player.stepPosition(dt);
            player.setIsInJumpPosition(this.canPlayerJump(player, opponent));
            player.setIsInDashPosition(this.isInDashPosition(player, opponent));
        }
        for (const ball of this.balls) {
            ball.stepVelocity(dt, 1, true);
            ball.stepPositionAndOrientation(dt);
        }
        if (!isSimulation) {
            this.launchPlayersWithGoodTiming();
            if (this.checkForAndScorePoint())
                return true;
        }
        this.manageCollisions(isSimulation);
        this.handleActionInputs(dt);
        this.constrainPlayers();
        this.constrainBalls();
        return false;
    }
    simulateStep(dt) {
        for (const p of this.players.values()) {
            p.stepVelocity(dt);
            p.stepPosition(dt);
        }
        for (const ball of this.balls) {
            ball.stepVelocity(dt, 1, true);
            ball.stepPositionAndOrientation(dt);
        }
        this.manageCollisions(true);
        this.constrainPlayers();
        this.constrainBalls();
    }
    updateFuturePrediction() {
        // Copy current player/ball info to temp so we can step w/o wrecking things
        const sbReal = [];
        const p0Real = this.player(types_1.PlayerSide.Left);
        const p1Real = this.player(types_1.PlayerSide.Right);
        const p0Copy = p0Real.deepCopy();
        const p1Copy = p1Real.deepCopy();
        this.players.set(types_1.PlayerSide.Left, p0Copy);
        this.players.set(types_1.PlayerSide.Right, p1Copy);
        for (let i = 0; i < this.balls.length; i++) {
            sbReal[i] = this.balls[i];
            this.balls[i] = this.balls[i].deepCopy();
            const prediction = this.futurePredictionList[i];
            prediction.ballStates = [];
            // Clear old important markers
            prediction.ballHittingGround.isKnown = false;
            prediction.ballCrossingNet.isKnown = false;
            prediction.ballEnteringJumpRange(types_1.PlayerSide.Left).isKnown = false;
            prediction.ballEnteringJumpRange(types_1.PlayerSide.Right).isKnown = false;
        }
        let time = 0;
        const timeElapsed = this.currentGameTime.totalGameTime.totalSeconds;
        const p0JumpHeight = p0Copy.getMaxJumpHeight();
        const p1JumpHeight = p1Copy.getMaxJumpHeight();
        while (time < tweakables_1.default.predictionLookaheadSec) {
            this.simulateStep(tweakables_1.default.predictionPhysicsDtSec);
            time += tweakables_1.default.predictionPhysicsDtSec;
            const currStep = (time + timeElapsed) / tweakables_1.default.predictionStorageDtSec;
            const lastStep = (time - tweakables_1.default.predictionPhysicsDtSec + timeElapsed) / tweakables_1.default.predictionStorageDtSec;
            for (let i = 0; i < this.balls.length; i++) {
                const state = (0, future_prediction_1.unknownState)();
                const ballPhysics = this.balls[i].physics;
                const prediction = this.futurePredictionList[i];
                state.pos = ballPhysics.center;
                state.time = time;
                if (Math.round(currStep) !== Math.round(lastStep)) {
                    prediction.ballStates.push(state);
                }
                if (!prediction.ballHittingGround.isKnown && ballPhysics.center.y - ballPhysics.diameter / 2 <= 0.0) {
                    prediction.ballHittingGround = state;
                    prediction.ballHittingGround.isKnown = true;
                }
                else if (!prediction.ballCrossingNet.isKnown && Math.abs(ballPhysics.center.x - this.net.center.x) < ballPhysics.diameter / 4.0) {
                    prediction.ballCrossingNet = state;
                    prediction.ballCrossingNet.isKnown = true;
                }
                if (!prediction.ballEnteringJumpRange(types_1.PlayerSide.Left).isKnown &&
                    ballPhysics.center.x < this.net.center.x - this.net.width / 2 &&
                    ballPhysics.center.y <= p0JumpHeight) {
                    state.isKnown = true;
                    prediction.setBallEnteringJumpRange(types_1.PlayerSide.Left, state);
                }
                if (!prediction.ballEnteringJumpRange(types_1.PlayerSide.Right).isKnown &&
                    ballPhysics.center.x > this.net.center.x + this.net.width / 2 &&
                    ballPhysics.center.y <= p1JumpHeight) {
                    state.isKnown = true;
                    prediction.setBallEnteringJumpRange(types_1.PlayerSide.Right, state);
                }
            }
        }
        for (let i = 0; i < this.balls.length; i++) {
            this.balls[i] = sbReal[i];
        }
        this.players.set(types_1.PlayerSide.Left, p0Real);
        this.players.set(types_1.PlayerSide.Right, p1Real);
    }
    runActionOrPostPointState() {
        const dt = this.currentGameTime.elapsedGameTime.totalSeconds;
        let physicsDtCountdown = dt;
        if (this.currentGameTime.totalGameTime.totalMilliseconds > this.lastFuturePrediction + tweakables_1.default.predictFutureEveryMs) {
            this.updateFuturePrediction();
            this.lastFuturePrediction = this.currentGameTime.totalGameTime.totalMilliseconds;
        }
        while (physicsDtCountdown > 0) {
            const delta = Math.min(tweakables_1.default.physicsDtSec, physicsDtCountdown);
            this.gameStep(delta);
            physicsDtCountdown -= delta;
        }
        this.aIStep();
    }
    runMainMenuState() {
        this.handleMenuInputs();
    }
    runPreExitState() {
        this.handlePreExitInputs();
    }
    runIntroState() {
        this.handleIntroInputs();
    }
    runPausedState() {
        this.handleMenuInputs();
    }
    runAutoPausedState() {
        this.handleAutoPausedInputs();
    }
    runPostPointState() {
        const dt = this.currentGameTime.elapsedGameTime.totalSeconds;
        this.postPointStep(dt);
        this.handlePostPointInputs(dt);
    }
    runPreActionState() {
        this.setUpForServe();
        this.handlePreActionInputs();
    }
    runVictoryState() {
        this.handleVictoryInputs();
    }
    handleUniversalInputs() {
        if (this.input.wasDebugKeyJustPushed()) {
            this.menu.unlockAll = true;
            this.display.inDebugView = !this.display.inDebugView;
        }
    }
    getMaxHeightOfAllBalls() {
        let highest = -Infinity;
        for (const ball of this.balls) {
            highest = Math.max(highest, ball.physics.getBallMaxHeight(tweakables_1.default.gameGravity));
        }
        return highest;
    }
    update(gameTime) {
        if (this.gameState === types_1.GameState.PreStart) {
            this.setGameState(types_1.GameState.Intro1);
        }
        this.handleUniversalInputs();
        const dt = gameTime.elapsedGameTime.totalMilliseconds / 1000;
        this.accumulatedStateSeconds += dt;
        if (this.gameState === types_1.GameState.Action)
            this.accumulatedPointSeconds += dt;
        switch (this.gameState) {
            case types_1.GameState.Action:
                this.display.adjustZoomLevel(this.getMaxHeightOfAllBalls(), dt);
                this.runActionOrPostPointState();
                break;
            case types_1.GameState.Paused:
                this.display.adjustZoomLevel(1000, dt);
                this.runPausedState();
                break;
            case types_1.GameState.AutoPaused:
                this.display.adjustZoomLevel(1000, dt);
                this.runAutoPausedState();
                break;
            case types_1.GameState.MainMenu:
                this.runMainMenuState();
                break;
            case types_1.GameState.Intro1:
            case types_1.GameState.Intro2:
            case types_1.GameState.Intro3:
                this.runIntroState();
                break;
            case types_1.GameState.PointScored:
                this.runPostPointState();
                break;
            case types_1.GameState.PreAction:
                this.runPreActionState();
                break;
            case types_1.GameState.Victory:
                this.display.adjustZoomLevel(1000, dt);
                this.runVictoryState();
                break;
            case types_1.GameState.PreExitMessage:
            case types_1.GameState.PreExitCredits:
                this.runPreExitState();
                break;
            case types_1.GameState.Exit:
                return false;
        }
        return true;
    }
}
exports.Game = Game;
