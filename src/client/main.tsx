// Entry point of the real UI. The debug page of step 3 still lives at /debug.html until the end of step 4.
import { render } from 'preact';
import { App } from './App.tsx';
import './styles/base.css';
import './styles/controls.css';

render(<App />, document.querySelector('#app')!);
