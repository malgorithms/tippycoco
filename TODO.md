### Quicker and easier than Github issues for now

Stuff

- menu redesign:
  - which characters have you beaten, including trophies
    - trophies are for achievements against them
  - which characters are unlocked (and how to unlock?)
  - visual representation of characters
  - give characters names
  - more characters
  - bot template support
    - disabled but visible with explanation you can write your own
    - activated as soon as you edit something like myBot.ts
- make clouds more like moon; parallax
- code quality and technical debt:
  - move all hard-coded constants into existing tweakables.ts. What a mess.
  - clean up all the player and playerconfig iterations in game.ts
- firefox:
  - controller lag
  - button mappings different from chrome & safari
  - fps sucks
  - warning when controller connected, if bugs not fixable
- controller work:
  - autopause on disconnect
- performance:
  - consider no clouds on slow framerate
  - check if not drawing off-screen clouds affects things
  - consider separate timer on re-drawing
  - profile JS
- test on old iMac
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

Before launching

- discord to discuss
- proper readme page for github
- review all console logging
- basic SEO of landing page
- basic pageview stats?
- better favicon / larger ones for bookmarking
