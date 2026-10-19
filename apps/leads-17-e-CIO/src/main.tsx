import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import { ChatScreen } from './ChatScreen';
import { ValidarScreen } from './ValidarScreen';

/** Dois links, dois públicos (regra do dono, 09-01): o QR do participante
 *  aponta para `/` (chat) e o pessoal do estande recebe um LINK SEPARADO —
 *  `/validar#t=CHAVE`. A chave viaja no FRAGMENTO de propósito: fragmento
 *  nunca chega ao servidor nem a log de acesso. O hash `#/validar` continua
 *  aceito como fallback. */
function App() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const ehValidador = window.location.pathname.startsWith('/validar') || hash.startsWith('#/validar');
  return ehValidador ? <ValidarScreen /> : <ChatScreen />;
}

// Escopo de tokens do DS no <body>: os full-value tokens (--surface-page etc.)
// vivem sob `.bela-kit`, e é o body que pinta o fundo/overscroll da página.
document.body.classList.add('bela-kit');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
