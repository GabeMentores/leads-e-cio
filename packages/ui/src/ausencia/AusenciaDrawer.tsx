import { WEIGHT } from '../bela-kit';
import * as React from 'react';
import { CalendarClock, MoreVertical, Pencil, Plus } from 'lucide-react';
import { KitDrawer, KitBadge, KitButton, KitField, KitIconButton, KitInput, KitMenuItem, KitMenuPanel, KitMultiSelect, KitSelect, KitSwitch } from '../bela-kit';
import { KitSettingRow } from '../bela-kit/section';
import { useToast } from '../components/ui/toast';
import { getActiveProfile, useProfile } from '../profile/store';
import {
  fetchMinhasAusencias, criarAusencia, editarAusencia, encerrarAusencia, formatPeriodo, sortAusencias,
  delegationKindsFor, useDelegationCandidates, DELEGATION_KIND_LABELS,
  type AusenciaDTO, type DelegationKind,
} from './store';

/**
 * "Período de ausência" — autosserviço pelo menu ⚙ (desenho do user,
 * 2026-08-24, refinado na mesma data): o drawer PRINCIPAL lista as ausências
 * configuradas (vigentes primeiro) e o botão "Nova janela" (padrão do DS) abre
 * um SEGUNDO drawer de configuração — tipo de delegação (por papel), substituto,
 * início/fim e motivo. Sem "Fechar" no rodapé (o X do topo fecha). O ADMIN
 * gerencia o quadro de todos nas Configurações — mesma função, outra porta.
 */
export function AusenciaDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [janelas, setJanelas] = React.useState<AusenciaDTO[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [configOpen, setConfigOpen] = React.useState(false);
  const [editando, setEditando] = React.useState<AusenciaDTO | null>(null);

  const reload = React.useCallback(() => {
    fetchMinhasAusencias().then((list) => setJanelas(sortAusencias(list))).catch(() => setJanelas([]));
  }, []);

  React.useEffect(() => {
    if (open) reload();
  }, [open, reload]);

  const encerrar = async (j: AusenciaDTO) => {
    if (busy) return;
    setBusy(true);
    try {
      await encerrarAusencia(j.id);
      toast('Ausência encerrada — suas tarefas voltam para você.', 'success');
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível encerrar a ausência.', 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <KitDrawer
        open={open}
        onClose={onClose}
        aria-label="Período de ausência"
        header={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-muted)' }}>Aprovações e filas</span>
            <span style={{ fontWeight: WEIGHT.bold, fontSize: 'var(--body-lg-size)', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <CalendarClock size={18} aria-hidden="true" /> Período de ausência
            </span>
          </div>
        }
        bodyStyle={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
      >
        <p style={{ margin: 0, fontSize: 'var(--body-sm-size)', color: 'var(--text-secondary)' }}>
          Automatize a delegação de suas tarefas durante um período de ausência.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', padding: 'var(--space-1) 0' }}>
            <span style={{ fontSize: 'var(--caption-size)', fontWeight: WEIGHT.bold, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Ausências configuradas
            </span>
            {/* Fill (primary) — e "Criar janela" no drawer de configuração usa
                exatamente o mesmo spec (pedido do user, 2026-08-24). */}
            <KitButton variant="primary" iconLeft={<Plus size={14} />} onClick={() => setConfigOpen(true)}>
              Nova janela
            </KitButton>
          </div>
          {janelas.length === 0 && (
            <p style={{ margin: 0, padding: 'var(--space-2) 0', fontSize: 'var(--body-sm-size)', color: 'var(--text-muted)' }}>
              Nenhuma ausência configurada.
            </p>
          )}
          {janelas.map((j) => (
            <KitSettingRow
              key={j.id}
              label={`${j.kindsLabel} com ${j.toUserName}`}
              hint={`${formatPeriodo(j.startsAt, j.endsAt)}${j.reason ? ` · ${j.reason}` : ''}`}
              trailing={
                <KitBadge tone={j.status === 'active' ? 'success' : j.status === 'scheduled' ? 'brand' : 'neutral'}>
                  {j.statusLabel}
                </KitBadge>
              }
            >
              {j.status !== 'ended' ? (
                <AcoesDaJanela
                  janela={j}
                  busy={busy}
                  onEditar={() => setEditando(j)}
                  onEncerrar={() => { void encerrar(j); }}
                />
              ) : null}
            </KitSettingRow>
          ))}
        </div>
      </KitDrawer>

      {/* Drawer de CONFIGURAÇÃO — abre sobre o principal (padrão do artigo
          sobre o chat); criar volta para a lista atualizada. */}
      <AusenciaConfigDrawer
        open={configOpen || editando !== null}
        onClose={() => { setConfigOpen(false); setEditando(null); }}
        onCreated={() => { setConfigOpen(false); setEditando(null); reload(); }}
        editar={editando}
      />
    </>
  );
}

/** Configurar nova janela: FUNÇÕES delegadas (multi — o titular escolhe quais,
 *  pré-selecionadas todas as do papel), substituto (com a alçada de TODAS as
 *  escolhidas), início/fim, motivo e a transferência do backlog (só com
 *  Aprovações já vigente). Rodapé com UMA ação (padrão do DS); o X fecha. */
function AusenciaConfigDrawer({ open, onClose, onCreated, editar }: { open: boolean; onClose: () => void; onCreated: () => void; editar?: AusenciaDTO | null }) {
  const toast = useToast();
  const { backend } = useProfile();
  const availableKinds = delegationKindsFor(backend);
  const [kinds, setKinds] = React.useState<DelegationKind[]>(availableKinds);
  const { candidates } = useDelegationCandidates(kinds);
  const [toUserId, setToUserId] = React.useState('');
  const [inicio, setInicio] = React.useState('');
  const [fim, setFim] = React.useState('');
  const [motivo, setMotivo] = React.useState('');
  const [transferir, setTransferir] = React.useState(true);
  const [pendentes, setPendentes] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  // Reset + contagem de pendências (para o toggle dizer o número real) ao abrir.
  React.useEffect(() => {
    if (!open) return;
    setKinds(availableKinds);
    // Editando: os campos vêm da janela. As FUNÇÕES não entram no patch (mudar
    // o que é delegado no meio do caminho é outra janela, não uma edição), então
    // seguem as do papel.
    // Data LOCAL, não os 10 primeiros caracteres do ISO: o fim é gravado como
    // 23:59:59 local, que em UTC-3 cai no dia seguinte — fatiar a string
    // mostrava 13/10 numa janela que termina em 12/10.
    const iso = (d: string) => {
      const dt = new Date(d);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    };
    setToUserId(editar?.toUserId ?? '');
    setInicio(editar ? iso(editar.startsAt) : '');
    setFim(editar ? iso(editar.endsAt) : '');
    setMotivo(editar?.reason ?? '');
    setTransferir(true);
    fetch('/api/approvals?status=pending', { headers: { 'X-Persona': getActiveProfile().email } })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: { approverName?: string }[]) => {
        const me = getActiveProfile().persona.name;
        setPendentes(rows.filter((a) => a.approverName === me).length);
      })
      .catch(() => setPendentes(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editar]);


  // Mudar as funções pode invalidar o substituto (a alçada exigida muda).
  React.useEffect(() => { if (!editar) setToUserId(''); }, [kinds.join('|'), editar]);

  const hoje = new Date().toISOString().slice(0, 10);
  const vigenteJa = inicio !== '' && inicio <= hoje;
  const valido = kinds.length > 0 && toUserId !== '' && inicio !== '' && fim !== '' && fim >= inicio;

  const criar = async () => {
    if (!valido || busy) return;
    setBusy(true);
    try {
      if (editar) {
        await editarAusencia(editar.id, {
          toUserId,
          startsAt: new Date(`${inicio}T00:00:00`).toISOString(),
          endsAt: new Date(`${fim}T23:59:59`).toISOString(),
          reason: motivo.trim() || undefined,
        });
        toast('Janela de ausência atualizada.', 'success');
        onCreated();
        return;
      }
      const { transferred } = await criarAusencia({
        kinds, toUserId,
        startsAt: new Date(`${inicio}T00:00:00`).toISOString(),
        endsAt: new Date(`${fim}T23:59:59`).toISOString(),
        reason: motivo.trim() || undefined,
        transferPending: kinds.includes('approvals') && vigenteJa && transferir,
      });
      toast(
        transferred > 0
          ? `Ausência configurada — ${transferred} pendência(s) transferida(s) para o substituto.`
          : 'Ausência configurada.',
        'success',
      );
      onCreated();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível configurar a ausência.', 'danger');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KitDrawer
      open={open}
      onClose={onClose}
      aria-label={editar ? 'Editar janela de ausência' : 'Configurar nova janela de ausência'}
      header={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-muted)' }}>Período de ausência</span>
          <span style={{ fontWeight: WEIGHT.bold, fontSize: 'var(--body-lg-size)', color: 'var(--text-primary)' }}>{editar ? 'Editar janela' : 'Nova janela'}</span>
        </div>
      }
      footer={
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {/* Mesmo spec do "Nova janela" (primary sm) — os dois iguais. */}
          <KitButton variant="primary" disabled={!valido || busy} onClick={() => { void criar(); }}>
            {busy ? 'Salvando…' : editar ? 'Salvar alterações' : 'Criar janela'}
          </KitButton>
        </div>
      }
      bodyStyle={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
    >
      <KitField id="aus-funcoes" label="Funções delegadas" required hint="Escolha o que o substituto assume na sua ausência.">
        <KitMultiSelect
          aria-label="Funções delegadas"
          options={availableKinds.map((k) => ({ value: k, label: DELEGATION_KIND_LABELS[k] }))}
          value={kinds}
          onChange={(next) => setKinds(next as DelegationKind[])}
          placeholder="Selecione as funções"
          noun="funções"
          disabled={busy || availableKinds.length <= 1}
        />
      </KitField>
      <KitField id="aus-substituto" label="Substituto" required hint="Só quem tem a alçada de todas as funções escolhidas.">
        <KitSelect id="aus-substituto" value={toUserId} disabled={kinds.length === 0} onChange={(e) => setToUserId(e.target.value)}>
          <option value="" disabled>Selecione…</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>{c.name} · {c.profileLabel}</option>
          ))}
        </KitSelect>
      </KitField>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <KitField id="aus-inicio" label="Início" required style={{ flex: 1 }}>
          <KitInput id="aus-inicio" type="date" value={inicio} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInicio(e.currentTarget.value)} />
        </KitField>
        <KitField id="aus-fim" label="Fim" required style={{ flex: 1 }}>
          <KitInput id="aus-fim" type="date" value={fim} min={inicio || undefined} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFim(e.currentTarget.value)} />
        </KitField>
      </div>
      <KitField id="aus-motivo" label="Motivo">
        <KitInput id="aus-motivo" value={motivo} placeholder="Ex.: Férias" onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMotivo(e.currentTarget.value)} />
      </KitField>
      {kinds.includes('approvals') && vigenteJa && pendentes > 0 && (
        <KitSettingRow
          label={`Transferir ${pendentes} pendência(s) atual(is)`}
          hint="As aprovações que já aguardam sua decisão vão para o substituto agora."
        >
          <KitSwitch checked={transferir} disabled={busy} onChange={(next) => setTransferir(next)} />
        </KitSettingRow>
      )}
      {!vigenteJa && inicio !== '' && (
        <p style={{ margin: 0, fontSize: 'var(--caption-size)', color: 'var(--text-muted)' }}>
          Janela agendada: vale a partir do início do período.
        </p>
      )}
    </KitDrawer>
  );
}

/** Ações da linha num KEBAB (user, 2026-08-27) — era um botão "Encerrar" solto.
 *  Encerrar é DESTRUTIVO: vem em vermelho (`tone="danger"` do KitMenuItem) e com
 *  DUPLA CONFIRMAÇÃO — o próprio menu troca de conteúdo e pergunta, mesmo padrão
 *  de dois passos do "Descartar alterações" das Configurações. Sem isso, um
 *  clique errado devolve pendências que já estavam com o substituto.
 *  "Editar" só existe em janela AGENDADA: vigente já transferiu trabalho, e o
 *  backend recusa (409) — a tela não oferece o que seria negado. */
function AcoesDaJanela({
  janela, busy, onEditar, onEncerrar,
}: {
  janela: AusenciaDTO;
  busy: boolean;
  onEditar: () => void;
  onEncerrar: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [confirmando, setConfirmando] = React.useState(false);
  const fechar = () => { setOpen(false); setConfirmando(false); };
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <KitIconButton
        variant="ghost"
        size="sm"
        label={`Ações da janela com ${janela.toUserName}`}
        icon={<MoreVertical size={16} />}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
      />
      <KitMenuPanel open={open} onClose={fechar} width={248} aria-label="Ações da janela de ausência">
        {confirmando ? (
          <>
            <p style={{ margin: 0, padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--body-sm-size)', color: 'var(--text-secondary)' }}>
              Encerrar agora? As tarefas delegadas voltam para você.
            </p>
            <KitMenuItem
              icon={<CalendarClock size={16} />}
              label="Sim, encerrar"
              tone="danger"
              onClick={() => { fechar(); onEncerrar(); }}
            />
            <KitMenuItem label="Cancelar" onClick={fechar} />
          </>
        ) : (
          <>
            {janela.status === 'scheduled' && (
              <KitMenuItem icon={<Pencil size={16} />} label="Editar" onClick={() => { setOpen(false); onEditar(); }} />
            )}
            <KitMenuItem
              icon={<CalendarClock size={16} />}
              label="Encerrar"
              tone="danger"
              onClick={() => setConfirmando(true)}
            />
          </>
        )}
      </KitMenuPanel>
    </span>
  );
}
