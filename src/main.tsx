import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { v4 as uuidv4 } from 'uuid';
import App from './App.tsx'
import { Madoi } from 'madoi-client';
import { madoiUrl, madoiKey } from './keys.ts';

const roomId = "madoi-sample-ts-react-webrtc-simple-sadfo22023";
const madoi = new Madoi(
  `${madoiUrl}/${roomId}`, madoiKey,
  {id: uuidv4(), profile: {}});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App madoi={madoi} />
  </StrictMode>
);
