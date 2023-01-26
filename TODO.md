### Quicker and easier than Github issues for now

Stuff

- localstorage stats system
  - victories against each opponent
  - shutouts against each opponent
  - victory without jumping
- menu redesign:
  - which characters have you beaten
    - trophies for achievements against them
  - which characters are unlocked (and how to unlock?)
  - give characters names
  - more characters
  - bot template support
    - disabled but visible with explanation you can write your own
    - activated as soon as you edit something like myBot.ts
- code quality and technical debt:
  - move all hard-coded constants into existing tweakables.ts. What a mess.
  - clean up all the player and playerconfig iterations in game.ts
- firefox on mac:
  - controller lag
  - button mappings different from chrome & safari
  - fps sucks
  - warning when controller connected, if bugs not fixable
- gamepad work:
  - can't move through menu with gamepad thumbsticks
  - autopause on disconnect
- performance:
  - smaller png's - most new non-transparent should be switched to 8-bit
  - consider no clouds on slow framerate
  - check if not drawing off-screen clouds affects things
  - consider separate timer on re-drawing
  - profile JS
  - test on old iMac
  - consider caching localstorage (persistence.ts) lookups when drawing menu
- possible achievements:
  - shut out
  - no jumps win
  - all points scored while tiny
- better intro with them emerging from the ground, possibly launching debris
- switch drawing players to pure canvas actions? might make for more creative additions/eyes/etc.
- growth/shrink sounds:
  - breathe in/out, with pitch by speed?
  - fix bug where it persists on game pause or end
- sound improvements:
  - if ball bounces in rapid succession (fast volley?) pitch increases
  - fix ding off flower...too bell-like, echoey
- exiting game shouldn't cause reload

Before launching

- discord to discuss
- proper readme page for github
- review all console logging
- basic SEO of landing page
- basic pageview stats?
- better favicon / larger ones for bookmarking
