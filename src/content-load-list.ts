const textureSources = {
  ball1: 'images/Volleyball1.png',
  ball2: 'images/Volleyball2.png',
  ballShadow: 'images/BallShadow.png',
  net: 'images/Net.png',
  redPlayer: 'images/Players/RedPlayer.png',
  greenPlayer: 'images/Players/GreenPlayer.png',
  orangePlayer: 'images/Players/OrangePlayer.png',
  purplePlayer: 'images/Players/PurplePlayer.png',
  whitePlayer: 'images/Players/WhitePlayer.png',
  blackPlayer: 'images/Players/BlackPlayer.png',
  yellowPlayer: 'images/Players/YellowPlayer.png',
  bluePlayer: 'images/Players/BluePlayer.png',
  pupil: 'images/Players/Pupil.png',
  pupilAngry1: 'images/Players/PupilAngry1.png',
  pupilAngry2: 'images/Players/PupilAngry2.png',
  pupilGray: 'images/Players/PupilGray.png',
  scoreCard: 'images/ScoreCard.png',
  leftFlower: 'images/FlowerLeft.png',
  rightFlower: 'images/FlowerRight.png',
  leftFlowerTop: 'images/FlowerTop1.png',
  rightFlowerTop: 'images/FlowerTop2.png',
  floorFront: 'images/FloorFront.png',
  floorBack: 'images/FloorBack.png',
  playerShadowBehind: 'images/PlayerShadowBehind.png',
  playerShadowFront: 'images/PlayerShadowFront.png',
  gamepad: 'images/Gamepad.png',
  keyboard: 'images/Keyboard.png',
  moon: 'images/Atmosphere/Moon.png',
  predictionDot: 'images/PredictionDot.png',
  kapowSlam: 'images/Kapows/KapowSlam.png',
  kapowRejected: 'images/Kapows/KapowRejected.png',
  kapowScore: 'images/Kapows/KapowScore.png',
  sunnyCloud1: 'images/Atmosphere/SunnyCloud1.png',
  darkCloud1: 'images/Atmosphere/DarkCloud1.png',
  sunnyCloud2: 'images/Atmosphere/SunnyCloud2.png',
  darkCloud2: 'images/Atmosphere/DarkCloud2.png',
  sunnyCloud3: 'images/Atmosphere/SunnyCloud3.png',
  darkCloud3: 'images/Atmosphere/DarkCloud3.png',
  sunnyCloud4: 'images/Atmosphere/SunnyCloud4.png',
  darkCloud4: 'images/Atmosphere/DarkCloud4.png',
  sunnyCloud5: 'images/Atmosphere/SunnyCloud5.png',
  darkCloud5: 'images/Atmosphere/DarkCloud5.png',
  sunnyBackgroundBlue: 'images/Atmosphere/SunnyBackground.png',
  sunnyBackgroundPurplish: 'images/Atmosphere/SunnyBackgroundPurplish.png',
  sunnyBackgroundGreen: 'images/Atmosphere/SunnyBackground.png',
  sunnyBackgroundBlack: 'images/Atmosphere/SunnyBackgroundBlack.png',
  sunnyBackgroundFire: 'images/Atmosphere/SunnyBackgroundFire.png',
  darkBackground: 'images/Atmosphere/DarkBackground.png',
  /* misc menu cards */
  menuCardReturnToGame: 'images/MenuCards/ReturnToGame.png',
  menuCardExit: 'images/MenuCards/Exit.png',
  menuCardShadow: 'images/MenuCards/Shadow.png',
  menuCardLockOverlay: 'images/MenuCards/LockOverlay.png',
  /* human opponent cards */
  menuCardHuman1Ball: 'images/MenuCards/Human1Ball.png',
  menuCardHuman2Balls: 'images/MenuCards/Human2Balls.png',
  /* computer opponent cards */
  menuCardPlayGreen: 'images/MenuCards/PlayGreen.png',
  menuCardPlayYellow: 'images/MenuCards/PlayYellow.png',
  menuCardPlayOrange: 'images/MenuCards/PlayOrange.png',
  menuCardPlayPurple: 'images/MenuCards/PlayPurple.png',
  menuCardPlayBlack: 'images/MenuCards/PlayBlack.png',
  menuCardPlayWhite: 'images/MenuCards/PlayWhite.png',
} as const

const soundSources = {
  themeSong: 'sounds/ThemeSong.mp3',
  flowerBounce: 'sounds/FlowerBounce.mp3',
  slam: 'sounds/Slam.mp3',
  thud: 'sounds/Thud.mp3',
  dash: 'sounds/Dash.mp3',
  rejected: 'sounds/Rejected.mp3',
  pointScored: 'sounds/PointScored.mp3',
  gamePlayMusic: 'sounds/GamePlay02.mp3',
  p1Growth: 'sounds/Inhale.mp3',
  p2Growth: 'sounds/Inhale.mp3',
  p1Shrinkage: 'sounds/Exhale.mp3',
  p2Shrinkage: 'sounds/Exhale.mp3',
  ceramicBounce: 'sounds/CeramicBounce.mp3',
  gamePoint: 'sounds/GamePoint.mp3',
} as const

type TextureName = keyof typeof textureSources
type SoundName = keyof typeof soundSources

export {TextureName, SoundName, textureSources, soundSources}
