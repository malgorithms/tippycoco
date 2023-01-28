### Quicker and easier than Github issues for now

Stuff

- check out white ai mirror maneuver
- more characters?
- menu redesign:
  - bot template support
    - disabled but visible with explanation you can write your own
    - activated as soon as you edit something like myBot.ts
- sharing idea: stats page with info in URL!
- code quality and technical debt:
  - move all hard-coded constants into existing tweakables.ts. What a mess.
  - clean up all the player and playerconfig iterations in game.ts
- firefox on mac:
  - controller lag
  - button mappings different from chrome & safari
  - fps sucks
  - warning when controller connected, if bugs not fixable
- performance:
  - smaller png's - most new non-transparent should be switched to 8-bit
  - consider no clouds on slow framerate
  - check if not drawing off-screen clouds affects things
  - profile JS
  - test on old iMac
  - consider caching localstorage (persistence.ts) lookups when drawing menu
  - explore higher physicsDt / predictionDt
- better intro with them emerging from the ground, possibly launching debris
- sound improvements:
  - ball hitting ground sound
  - if ball bounces in rapid succession (fast volley?) pitch increases
  - fix ding off flower...too bell-like, echoey.
  - growth/shrink sounds:
    - breathe in/out, with pitch by speed?
    - fix bug where it persists on game pause or end
- better action after ball hitting ground (maybe not freezing? keeps bouncing?)
- exiting game shouldn't cause reload

Before launching

- discord to discuss
- proper readme page for github
- review all console logging
- basic SEO of landing page
- basic pageview stats?
- better favicon / larger ones for bookmarking
