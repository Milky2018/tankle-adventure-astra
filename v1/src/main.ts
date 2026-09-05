import './style.css';
import { Game } from './game/Game';

const viewport = document.querySelector<HTMLElement>('#viewport');
if (!viewport) throw new Error('Missing game viewport');

const game = new Game(viewport);
game.start();

if (import.meta.hot) import.meta.hot.dispose(() => game.destroy());
