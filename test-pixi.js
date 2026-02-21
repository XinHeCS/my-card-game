import * as PIXI from 'pixi.js';

try {
  PIXI.Sprite.from('red');
  console.log('Success!');
} catch(e) {
  console.log('Error:', e.message);
}
