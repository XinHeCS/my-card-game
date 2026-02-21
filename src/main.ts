/**
 * PixiJS 2D Game - Main Entry
 */

import * as PIXI from 'pixi.js';
import { Application } from 'pixi.js';
import { Engine } from './engine/Engine';
import { TitleScene } from './game/TitleScene';
import { PlatformBridge } from './platform/Bridge';

// 暴露 PIXI 到全局（供 VAG DevTools 使用）
;(window as any).PIXI = PIXI;

async function main() {
  // Remove loading indicator
  const loading = document.querySelector('.loading');
  if (loading) loading.remove();

  // Create PixiJS Application
  const app = new Application();
  
  await app.init({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x0a0a15,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  // Add canvas to container
  const container = document.getElementById('game-container');
  if (container) {
    container.appendChild(app.canvas);
  }

  // 暴露 app 到全局和 canvas（供 VAG DevTools 使用）
  ;(window as any).pixiApp = app
  ;(app.canvas as any).__PIXI_APP__ = app

  // Initialize platform bridge
  const bridge = new PlatformBridge();

  // Create engine
  const engine = new Engine(app);

  // Create title scene
  const scene = new TitleScene(engine);
  engine.setScene(scene);

  // Handle resize
  window.addEventListener('resize', () => {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    engine.resize(window.innerWidth, window.innerHeight);
  });

  // Notify platform that game is ready
  bridge.sendReady();

  // Listen for platform commands
  bridge.onCommand((cmd) => {
    switch (cmd.type) {
      case 'VAG_PREVIEW_PLAY':
        engine.play();
        break;
      case 'VAG_PREVIEW_PAUSE':
        engine.pause();
        break;
      case 'reset':
        engine.reset();
        break;
    }
  });

  // Start the game
  engine.start();

  // Focus canvas for keyboard input
  app.canvas.focus();
  app.canvas.tabIndex = 0;
}

main().catch(console.error);
