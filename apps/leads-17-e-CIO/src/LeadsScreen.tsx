// Tela 3 — os leads do comercial (/leads#t=CHAVE). Espelha a tabela
// `leads_17_e_cio` do Supabase (via GET /api/leads, protegido pelo
// LEADS_ADMIN_TOKEN) e exporta o que está na tela em PDF.
// A chave segue o mesmo trato do validador: viaja no FRAGMENTO do link e fica
// em sessionStorage — nunca em query string, nunca no bundle.
//
// MOBILE FIRST (user, 2026-10-19): a tabela virou lista de cards colapsáveis.
// Recolhido, o card diz quem é (nº · nome · status, e a empresa embaixo);
// expandido, como falar com a pessoa (e-mail, telefone, cargo). Os 3 contadores
// ficam numa linha só em qualquer largura.
import * as React from 'react';
import { FileDown, KeyRound, RefreshCw, Users } from 'lucide-react';
import {
  KitPage, KitPageHeader, KitField, KitInput, KitButton, KitCard, KitBadge,
  KitStateCard, KitKpi, KitTileGrid, KitSkeletonTiles, KitSkeletonCards, KitCollapsibleCard,
  KitFactList, useSkeletonGate, WEIGHT,
} from '@bela/ui';
import belagoLogo from './assets/belago-luxor-logo.svg';
import { formatarCelular, numerarLeads, type Lead, type LeadNumerado } from './lead-formato';

const CHAVE_STORAGE = 'bela.leads.admin';

function chaveDaUrl(): string | null {
  const hash = window.location.hash.replace(/^#/, '');
  return hash.startsWith('t=') ? new URLSearchParams(hash).get('t') : null;
}

function StatusGiro({ lead }: { lead: Lead }) {
  return lead.codigoUsadoEm
    ? <KitBadge tone="success" dot>girou</KitBadge>
    : <KitBadge tone="neutral" dot>aguardando</KitBadge>;
}

const umaLinha: React.CSSProperties = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

function CardLead({ lead }: { lead: LeadNumerado }) {
  return (
    <KitCollapsibleCard
      aria-label={`Lead ${lead.numero}: ${lead.nome}, ${lead.empresa}`}
      summary={
        <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--caption-size)', color: 'var(--text-muted)' }}>
              #{lead.numero}
            </span>
            <span style={{ ...umaLinha, flex: 1, fontSize: 'var(--body-md-size)', fontWeight: WEIGHT.semibold, color: 'var(--text-primary)' }}>
              {lead.nome}
            </span>
            <span style={{ flexShrink: 0 }}><StatusGiro lead={lead} /></span>
          </span>
          <span style={{ ...umaLinha, fontSize: 'var(--body-sm-size)', color: 'var(--text-secondary)' }}>{lead.empresa}</span>
        </span>
      }
    >
      <KitFactList
        labelWidth={72}
        rows={[
          { label: 'E-mail', value: <a href={`mailto:${lead.email}`} style={{ color: 'var(--text-brand)', wordBreak: 'break-all' }}>{lead.email}</a> },
          { label: 'Telefone', value: <a href={`tel:+55${lead.celular}`} style={{ color: 'var(--text-brand)' }}>{formatarCelular(lead.celular)}</a> },
          { label: 'Cargo', value: lead.cargo },
        ]}
      />
    </KitCollapsibleCard>
  );
}

export function LeadsScreen() {
  const [chave, setChave] = React.useState<string>(() => {
    const daUrl = chaveDaUrl();
    if (daUrl) { sessionStorage.setItem(CHAVE_STORAGE, daUrl); return daUrl; }
    return sessionStorage.getItem(CHAVE_STORAGE) ?? '';
  });
  const [chaveDigitada, setChaveDigitada] = React.useState('');
  const [chaveInvalida, setChaveInvalida] = React.useState(false);
  const [leads, setLeads] = React.useState<Lead[] | null>(null);
  const [carregando, setCarregando] = React.useState(false);
  const [falhou, setFalhou] = React.useState(false);
  const [exportando, setExportando] = React.useState(false);

  const carregar = React.useCallback(async () => {
    if (!chave) return;
    setCarregando(true);
    setFalhou(false);
    try {
      const resposta = await fetch('/api/leads', { headers: { 'X-Admin-Token': chave } });
      if (resposta.status === 401) {
        sessionStorage.removeItem(CHAVE_STORAGE);
        setChave('');
        setChaveInvalida(true);
        return;
      }
      if (!resposta.ok) { setFalhou(true); return; }
      const corpo = (await resposta.json()) as { leads: Lead[] };
      setLeads(corpo.leads);
    } catch {
      setFalhou(true);
    } finally {
      setCarregando(false);
    }
  }, [chave]);

  React.useEffect(() => { void carregar(); }, [carregar]);

  const lista = React.useMemo(() => numerarLeads(leads ?? []), [leads]);
  const giraram = lista.filter((l) => l.codigoUsadoEm).length;
  const mostrarEsqueleto = useSkeletonGate(carregando && leads === null);

  const exportar = async () => {
    setExportando(true);
    try {
      // Import sob demanda: o gerador de PDF não pesa no chat do participante.
      const { exportarLeadsPdf } = await import('./leads-pdf');
      exportarLeadsPdf(lista);
    } finally {
      setExportando(false);
    }
  };

  // Mesmo cabeçalho do chat e do validador. A coluna segura a leitura no
  // desktop; no celular ocupa a largura toda.
  const shell = (largura: number, children: React.ReactNode) => (
    <div className="bela-kit" style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'hsl(var(--surface-0))' }}>
      <header style={{ flexShrink: 0, background: 'var(--surface-card)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: largura, margin: '0 auto', padding: 'var(--space-4) var(--space-5)', display: 'flex', alignItems: 'center' }}>
          <img src={belagoLogo} alt="Belago | Luxor" style={{ height: 30, display: 'block' }} />
        </div>
      </header>
      <KitPage stack style={{ width: '100%', maxWidth: largura, padding: 'var(--space-5) var(--space-4)' }}>
        {children}
      </KitPage>
    </div>
  );

  // Sem a chave do comercial, nada aparece.
  if (!chave) {
    return shell(480,
      <>
        <KitPageHeader title="Leads" />
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
              id="chave" label="Chave do comercial" required
              error={chaveInvalida ? 'Chave incorreta — confira com quem organizou o evento.' : undefined}
              hint={chaveInvalida ? undefined : 'Está no link recebido pelo comercial.'}
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

  return shell(880,
    <>
      <KitPageHeader
        title="Leads"
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <KitButton variant="secondary" size="xs" disabled={carregando} onClick={() => void carregar()} iconLeft={<RefreshCw size={14} aria-hidden="true" />}>
              {carregando ? 'Atualizando…' : 'Atualizar'}
            </KitButton>
            <KitButton size="xs" disabled={exportando || lista.length === 0} onClick={() => void exportar()} iconLeft={<FileDown size={14} aria-hidden="true" />}>
              {exportando ? 'Gerando…' : 'Exportar PDF'}
            </KitButton>
          </div>
        }
      />

      {mostrarEsqueleto ? (
        <>
          <KitSkeletonTiles count={3} cols={3} />
          <KitSkeletonCards count={4} lines={2} />
        </>
      ) : falhou && leads === null ? (
        <KitCard padding="lg">
          <KitStateCard
            icon={<RefreshCw size={28} aria-hidden="true" />}
            title="Não deu para carregar os leads"
            text="Confira a conexão e tente de novo."
          >
            <KitButton variant="soft" onClick={() => void carregar()}>Tentar de novo</KitButton>
          </KitStateCard>
        </KitCard>
      ) : leads === null ? null : lista.length === 0 ? (
        <KitCard padding="lg">
          <KitStateCard
            icon={<Users size={28} aria-hidden="true" />}
            title="Nenhum lead ainda"
            text="Os cadastros feitos pelo chat aparecem aqui."
          />
        </KitCard>
      ) : (
        <>
          <KitTileGrid cols={3} fixed gap="var(--space-3)">
            <KitKpi label="Leads" value={String(lista.length)} />
            <KitKpi label="Giraram" value={String(giraram)} />
            <KitKpi label="Aguardando" value={String(lista.length - giraram)} />
          </KitTileGrid>

          <div role="list" aria-label="Leads cadastrados" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {lista.map((l) => (
              <div role="listitem" key={l.email}><CardLead lead={l} /></div>
            ))}
          </div>
        </>
      )}
    </>,
  );
}
