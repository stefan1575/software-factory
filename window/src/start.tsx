import '@fontsource/atkinson-hyperlegible-next/400.css';
import '@fontsource/atkinson-hyperlegible-next/500.css';
import '@fontsource/atkinson-hyperlegible-next/600.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './index.css';
import { SAMPLES } from './samples.ts';

const root = document.getElementById('root');
if (root === null) throw new Error('The page has no root.');
createRoot(root).render(
  <StrictMode>
    <App projects={SAMPLES} />
  </StrictMode>,
);
