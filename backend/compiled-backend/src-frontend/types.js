"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerSpecies = exports.PlayerSide = exports.GameState = void 0;
var PlayerSide;
(function (PlayerSide) {
    PlayerSide["Left"] = "left";
    PlayerSide["Right"] = "right";
})(PlayerSide || (PlayerSide = {}));
exports.PlayerSide = PlayerSide;
var PlayerSpecies;
(function (PlayerSpecies) {
    PlayerSpecies["Ai"] = "ai";
    PlayerSpecies["Human"] = "human";
})(PlayerSpecies || (PlayerSpecies = {}));
exports.PlayerSpecies = PlayerSpecies;
var GameState;
(function (GameState) {
    GameState["PreStart"] = "pre-start";
    GameState["Intro1"] = "intro1";
    GameState["Intro2"] = "intro2";
    GameState["Intro3"] = "intro3";
    GameState["MainMenu"] = "main-menu";
    GameState["PointScored"] = "point-scored";
    GameState["Victory"] = "victory";
    GameState["PreAction"] = "pre-action";
    GameState["Action"] = "action";
    GameState["Paused"] = "paused";
    GameState["AutoPaused"] = "auto-paused";
    GameState["PreExitMessage"] = "pre-exit-message";
    GameState["PreExitCredits"] = "pre-exit-credts";
    GameState["Exit"] = "exit";
})(GameState || (GameState = {}));
exports.GameState = GameState;
