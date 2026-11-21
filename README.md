# ASCII Christmas

Christmas animations drawn entirely with text characters, with carols.

- **Intro page** (`/`): pick an animation.
- **Spinning tree** (`/#tree`): a 3D tree in a wooden planter with presents, under a character sky. Swoosh across it to change the spin. Carols play while it runs, and the lights flash on each note.

It's a plain static site with no build step and no dependencies. The music is synthesised in the browser with the Web Audio API, so there are no audio files. All four carols are public domain: Jingle Bells, Silent Night, We Wish You a Merry Christmas and Joy to the World.

## Files

```
index.html      intro page + tree view
styles.css      theme and layout
js/scene.js     the character renderer: sky, mountains, moon, shooting stars, 3D tree
js/music.js     carol player (melodies, auto chords, bells, bass, sleigh bells, reverb)
js/app.js       intro title, cards, switching views, sound button
vercel.json     tells Vercel to serve the folder as-is
```

## Publish on Vercel

**Option A: Vercel CLI (fastest)**

```bash
npm i -g vercel
cd ascii-christmas
vercel --prod
```

The first run asks you to log in and a few setup questions. Accept the defaults: no build command, and the current folder as the output directory.

**Option B: GitHub**

1. Create a new GitHub repository and upload the contents of this folder to it.
2. Go to vercel.com → Add New → Project → import that repository.
3. Framework preset: **Other**. Leave the build command empty. Click Deploy.

## Run it locally

Open `index.html` in a browser, or serve the folder (for example `npx serve .`).

## Adding another animation

Replace the locked "02" card in `index.html` with a button, give it a hash route (for example `#snowglobe`), and handle that route in `route()` in `js/app.js`.
