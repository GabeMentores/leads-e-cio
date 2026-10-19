// Tela 3 — a tabela de leads do comercial (/leads#t=CHAVE). Espelha a tabela
// `leads_17_e_cio` do Supabase (via GET /api/leads, protegido pelo
// LEADS_ADMIN_TOKEN) e exporta o que está na tela em PDF.
// A chave segue o mesmo trato do validador: viaja no FRAGMENTO do link e fica
// em sessionStorage — nunca em query string, nunca no bundle.
import * as React from 'react';
import { FileDown, KeyRound, RefreshCw, Users } from 'lucide-react';
import {
  KitPage, KitPageHeader, KitField, KitInput, KitButton, KitCard, KitBadge,
  KitStateCard, KitKpi, KitTileGrid, KitSkeletonTable, useSkeletonGate,
  DataTable, SortableTh, DataTd, useTableSort, type TableComparators,
} from '@bela/ui';
import belagoLogo from './assets/belago-luxor-logo.svg';
import { formatarCelular, formatarData, type Lead } from './lead-formato';

const CHAVE_STORAGE = 'bela.leads.admin';

function chaveDaUrl(): string | null {
  const hash = window.location.hash.replace(/^#/, '');
  return hash.startsWith('t=') ? new URLSearchParams(hash).get('t') : null;
}

type Coluna = 'nome' | 'email' | 'empresa' | 'cargo' | 'codigo' | 'giro' | 'criadoEm';
const porTexto = (campo: keyof Lead) => (a: Lead, b: Lead) =>
  String(a[campo] ?? '').localeCompare(String(b[campo] ?? ''), 'pt-BR');
// 1º clique = "mais relevante primeiro": quem já girou no topo; cadastro mais
// recente no topo; texto em ordem alfabética.
const COMPARATORS: TableComparators<Lead, Coluna> = {
  nome: porTexto('nome'),
  email: porTexto('email'),
  empresa: porTexto('empresa'),
  cargo: porTexto('cargo'),
  codigo: porTexto('codigo'),
  giro: (a, b) => String(b.codigoUsadoEm ?? '').localeCompare(String(a.codigoUsadoEm ?? '')),
  criadoEm: (a, b) => String(b.criadoEm ?? '').localeCompare(String(a.criadoEm ?? '')),
};

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

  const linhas = leads ?? [];
  const sort = useTableSort(linhas, COMPARATORS);
  const giraram = linhas.filter((l) => l.codigoUsadoEm).length;
  const mostrarEsqueleto = useSkeletonGate(carregando && leads === null);

  const exportar = async () => {
    setExportando(true);
    try {
      // Import sob demanda: o gerador de PDF não pesa no chat do participante.
      const { exportarLeadsPdf } = await import('./leads-pdf');
      exportarLeadsPdf(sort.sorted);
    } finally {
      setExportando(false);
    }
  };

  // Mesmo cabeçalho do chat e do validador, mais largo: aqui a página é a tabela.
  const shell = (largura: number, children: React.ReactNode) => (
    <div className="bela-kit" style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'hsl(var(--surface-0))' }}>
      <header style={{ flexShrink: 0, background: 'var(--surface-card)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ maxWidth: largura, margin: '0 auto', padding: 'var(--space-4) var(--space-5)', display: 'flex', alignItems: 'center' }}>
          <img src={belagoLogo} alt="Belago | Luxor" style={{ height: 30, display: 'block' }} />
        </div>
      </header>
      <KitPage stack style={{ width: '100%', maxWidth: largura, padding: 'var(--space-5)' }}>
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

  return shell(1280,
    <>
      <KitPageHeader
        title="Leads"
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <KitButton variant="secondary" disabled={carregando} onClick={() => void carregar()} iconLeft={<RefreshCw size={16} aria-hidden="true" />}>
              {carregando ? 'Atualizando…' : 'Atualizar'}
            </KitButton>
            <KitButton disabled={exportando || linhas.length === 0} onClick={() => void exportar()} iconLeft={<FileDown size={16} aria-hidden="true" />}>
              {exportando ? 'Gerando…' : 'Exportar PDF'}
            </KitButton>
          </div>
        }
      />

      {mostrarEsqueleto ? (
        <KitSkeletonTable rows={8} toolbar={false} />
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
      ) : leads === null ? null : leads.length === 0 ? (
        <KitCard padding="lg">
          <KitStateCard
            icon={<Users size={28} aria-hidden="true" />}
            title="Nenhum lead ainda"
            text="Os cadastros feitos pelo chat aparecem aqui."
          />
        </KitCard>
      ) : (
        <>
          <KitTileGrid cols={3}>
            <KitKpi label="Leads" value={String(linhas.length)} />
            <KitKpi label="Já giraram" value={String(giraram)} />
            <KitKpi label="Aguardando giro" value={String(linhas.length - giraram)} />
          </KitTileGrid>

          <DataTable aria-label="Leads cadastrados" minWidth={1180} maxHeight={640}>
            <thead>
              <tr className="bg-surface-2 text-left text-text-secondary">
                <SortableTh colKey="nome" sort={sort}>Nome</SortableTh>
                <SortableTh colKey="email" sort={sort}>E-mail</SortableTh>
                <SortableTh>Celular</SortableTh>
                <SortableTh colKey="empresa" sort={sort}>Empresa</SortableTh>
                <SortableTh colKey="cargo" sort={sort}>Cargo</SortableTh>
                <SortableTh colKey="codigo" sort={sort}>Código</SortableTh>
                <SortableTh colKey="giro" sort={sort}>Giro</SortableTh>
                <SortableTh>Consentimento LGPD</SortableTh>
                <SortableTh colKey="criadoEm" sort={sort}>Cadastro</SortableTh>
                <SortableTh>Origem</SortableTh>
              </tr>
            </thead>
            <tbody>
              {sort.sorted.map((l) => (
                <tr key={l.email} className="border-t border-border-table align-top">
                  <DataTd className="text-text-primary">{l.nome}</DataTd>
                  <DataTd>{l.email}</DataTd>
                  <DataTd className="whitespace-nowrap">{formatarCelular(l.celular)}</DataTd>
                  <DataTd>{l.empresa}</DataTd>
                  <DataTd>{l.cargo}</DataTd>
                  <DataTd className="font-mono whitespace-nowrap">{l.codigo}</DataTd>
                  <DataTd className="whitespace-nowrap">
                    {l.codigoUsadoEm ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3xs)', alignItems: 'flex-start' }}>
                        <KitBadge tone="success" dot>girou</KitBadge>
                        <span className="text-text-muted">{formatarData(l.codigoUsadoEm)}</span>
                      </div>
                    ) : (
                      <KitBadge tone="neutral" dot>aguardando</KitBadge>
                    )}
                  </DataTd>
                  <DataTd className="whitespace-nowrap">{formatarData(l.consentimentoEm)}</DataTd>
                  <DataTd className="whitespace-nowrap">{formatarData(l.criadoEm)}</DataTd>
                  <DataTd className="text-text-muted whitespace-nowrap">{l.origem}</DataTd>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </>
      )}
    </>,
  );
}
