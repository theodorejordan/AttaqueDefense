// Entry point of the UI.
import { render } from 'preact';
import { App } from './App.tsx';
import './styles/base.css';
import './styles/controls.css';

render(<App />, document.querySelector('#app')!);
