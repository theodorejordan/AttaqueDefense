// Entry point of the real UI. The debug page of step 3 lives at /debug.html until the table replaces it.
import { render } from 'preact';
import { App } from './App.tsx';
import './styles/base.css';
import './styles/controls.css';

render(<App />, document.querySelector('#app')!);
