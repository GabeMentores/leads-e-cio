// Tela 2 — o validador do staff (#/validar?t=CHAVE). Só valida e libera o
// giro: a lista de leads fica no painel do Supabase / GET /api/leads.
// Três respostas possíveis para um código: válido (com "Confirmar giro"),
// já utilizado (com quando) e não encontrado.
import * as React from 'react';
import { Check, SearchX, KeyRound } from 'lucide-react';
import {
  KitPage, KitPageHeader, KitField, KitInput, KitButton, KitCard,
  KitBadge, KitStateCard, WEIGHT,
} from '@bela/ui';
import belagoLogo from './assets/belago-luxor-logo.svg';
import { normalizarCodigo } from '../shared/codigo';

type Resultado =
  | { status: 'valido'; nome: string; empresa: string }
  | { status: 'confirmado'; nome: string }
  | { status: 'ja_usado'; nome?: string; usadoEm: string | null }
  | { status: 'nao_encontrado' };

const CHAVE_STORAGE = 'bela.leads.chave';

/** A chave vem no FRAGMENTO do link do staff — `/validar#t=CHAVE` (forma
 *  canônica) ou `#/validar?t=CHAVE` (fallback por hash). Nunca em query string
 *  de verdade: fragmento não chega a servidor nem a log. */
function chaveDaUrl(): string | null {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash.startsWith('t=')) return new URLSearchParams(hash).get('t');
  const query = hash.split('?')[1];
  if (!query) return null;
  return new URLSearchParams(query).get('t');
}

function formatarQuando(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function ValidarScreen() {
  const [chave, setChave] = React.useState<string>(() => {
    const daUrl = chaveDaUrl();
    if (daUrl) { sessionStorage.setItem(CHAVE_STORAGE, daUrl); return daUrl; }
    return sessionStorage.getItem(CHAVE_STORAGE) ?? '';
  });
  const [chaveDigitada, setChaveDigitada] = React.useState('');
  const [chaveInvalida, setChaveInvalida] = React.useState(false);
  const [codigo, setCodigo] = React.useState('');
  const [resultado, setResultado] = React.useState<Resultado | null>(null);
  const [carregando, setCarregando] = React.useState(false);
  const [falhou, setFalhou] = React.useState(false);

  const chamar = React.useCallback(async (confirmar: boolean) => {
    setCarregando(true);
    setFalhou(false);
    try {
      const resposta = await fetch('/api/validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Staff-Token': chave },
        body: JSON.stringify({ codigo: normalizarCodigo(codigo), confirmar }),
      });
      if (resposta.status === 401) {
        sessionStorage.removeItem(CHAVE_STORAGE);
        setChave('');
        setChaveInvalida(true);
        return;
      }
      if (!resposta.ok) { setFalhou(true); return; }
      setResultado(await resposta.json());
    } catch {
      setFalhou(true);
    } finally {
      setCarregando(false);
    }
  }, [chave, codigo]);

  const limpar = () => { setResultado(null); setCodigo(''); setFalhou(false); };

  // Mesmo cabeçalho do chat (referência do user, 09-01): faixa branca com o
  // logo + divider, conteúdo no fundo suave.
  const shell = (children: React.ReactNode) => (
    <div className="bela-kit" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'hsl(var(--surface-0))' }}>
      <header style={{ flexShrink: 0, background: 'var(--surface-card)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: 'var(--space-4) var(--space-5)', display: 'flex', alignItems: 'center' }}>
          <img src={belagoLogo} alt="Belago | Luxor" style={{ height: 30, display: 'block' }} />
        </div>
      </header>
      <KitPage stack style={{ width: '100%', maxWidth: 480, padding: 'var(--space-5)' }}>
        {children}
      </KitPage>
    </div>
  );

  // Sem a chave da equipe, nada aparece — nem o campo de código.
  if (!chave) {
    return shell(
      <>
        <KitPageHeader title="Roleta de prêmios" />
        <KitCard padding="lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!chaveDigitada.trim()) return;
              sessionStorage.setItem(CHAVE_STORAGE, chaveDigitada.trim());
              setChave(chaveDigitada.trim());
              setChaveInvalida(false);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
          >
            <KitField
              id="chave" label="Chave da equipe" required
              error={chaveInvalida ? 'Chave incorreta — confira com quem organizou o estande.' : undefined}
              hint={chaveInvalida ? undefined : 'Está no link recebido pela equipe do estande.'}
            >
              <KitInput
                id="chave" type="password" autoComplete="off" autoFocus
                iconLeft={<KeyRound size={16} aria-hidden="true" />}
                value={chaveDigitada}
                invalid={chaveInvalida}
                onChange={(e) => setChaveDigitada(e.target.value)}
              />
            </KitField>
            <KitButton type="submit" fullWidth disabled={!chaveDigitada.trim()}>Entrar</KitButton>
          </form>
        </KitCard>
      </>,
    );
  }

  return shell(
    <>
      <KitPageHeader title="Validar código" />

      {resultado === null && (
        <KitCard padding="lg">
          <form
            onSubmit={(e) => { e.preventDefault(); if (normalizarCodigo(codigo).length === 6) void chamar(false); }}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
          >
            <KitField
              id="codigo" label="Código do participante" required
              error={falhou ? 'Não deu para consultar agora — tente de novo.' : undefined}
            >
              <KitInput
                id="codigo" autoFocus autoComplete="off" maxLength={8}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="A1B2C3"
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase' }}
              />
            </KitField>
            <KitButton type="submit" fullWidth disabled={carregando || normalizarCodigo(codigo).length !== 6}>
              {carregando ? 'Consultando…' : 'Validar'}
            </KitButton>
          </form>
        </KitCard>
      )}

      {resultado?.status === 'valido' && (
        <KitCard padding="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div><KitBadge tone="success" dot>código válido</KitBadge></div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: WEIGHT.bold, fontSize: 'var(--heading-md-size)', color: 'var(--text-primary)' }}>
                {resultado.nome}
              </div>
              <div style={{ fontSize: 'var(--body-sm-size)', color: 'var(--text-secondary)' }}>{resultado.empresa}</div>
            </div>
            <KitButton fullWidth disabled={carregando} onClick={() => void chamar(true)}>
              {carregando ? 'Confirmando…' : 'Confirmar giro'}
            </KitButton>
            <KitButton variant="ghost" fullWidth onClick={limpar}>Cancelar</KitButton>
          </div>
        </KitCard>
      )}

      {resultado?.status === 'confirmado' && (
        <KitCard padding="lg">
          <KitStateCard
            icon={<Check size={28} aria-hidden="true" />}
            title="Giro liberado!"
            text={`${resultado.nome} pode girar a roleta.`}
          >
            <KitButton variant="soft" onClick={limpar}>Validar outro código</KitButton>
          </KitStateCard>
        </KitCard>
      )}

      {resultado?.status === 'ja_usado' && (
        <KitCard padding="lg">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div><KitBadge tone="warning" dot>código já utilizado</KitBadge></div>
            <div style={{ fontSize: 'var(--body-md-size)', color: 'var(--text-primary)' }}>
              {resultado.nome ? `${resultado.nome} já girou a roleta` : 'Este código já girou a roleta'}
              {resultado.usadoEm ? ` em ${formatarQuando(resultado.usadoEm)}.` : '.'}
            </div>
            <KitButton variant="soft" fullWidth onClick={limpar}>Validar outro código</KitButton>
          </div>
        </KitCard>
      )}

      {resultado?.status === 'nao_encontrado' && (
        <KitCard padding="lg">
          <KitStateCard
            icon={<SearchX size={28} aria-hidden="true" />}
            title="Código não encontrado"
            text="Confira o código na tela do participante e tente de novo."
          >
            <KitButton variant="soft" onClick={limpar}>Tentar de novo</KitButton>
          </KitStateCard>
        </KitCard>
      )}
    </>,
  );
}
