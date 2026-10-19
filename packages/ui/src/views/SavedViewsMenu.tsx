import * as React from 'react';
import { Bookmark, Check, Trash2 } from 'lucide-react';
import { WEIGHT, KitIconButton, KitMenuPanel, KitMenuItem, KitInput, KitButton } from '../bela-kit';
import { useToast } from '../components/ui/toast';
import { useSavedViews } from './store';

/**
 * Menu de VISÕES SALVAS de uma tabela (Caderno §4.2 "salvar visão"; §4.5 como
 * padrão de TABELA; §4.3 Gestor de operação "criar visões... configurar filtros
 * salvos").
 *
 * Nasceu no DS por autorização do user (2026-09-10) depois de o mesmo bloco
 * existir duplicado em Lista de tickets e Assets — que é como divergem duas
 * cópias da mesma coisa (CLAUDE.md §10.1). Mora aqui, e não em `bela-kit`,
 * porque tem STORE próprio: mesmo precedente do `ausencia/AusenciaDrawer`.
 * O `bela-kit` guarda primitivo sem estado; isto é composição com dado.
 *
 * O GATILHO é só o ícone de salvo (user, 2026-09-10). Como não há rótulo na
 * tela, o `label` do KitIconButton vira `aria-label` e `title` — o nome existe
 * para o leitor de tela e para quem passa o mouse — e o PAINEL se nomeia no
 * cabeçalho. Sem esse cabeçalho o menu abriria numa lista de nomes soltos, sem
 * dizer que são visões.
 *
 * GENÉRICO NO FILTRO: cada tela define o próprio formato `F`. O componente não
 * conhece filtro nenhum — guarda o que `current()` devolver e entrega de volta
 * em `onApply`. É o que permite a mesma peça servir a fila de tickets e o
 * inventário sem variante.
 */
export interface SavedViewsMenuProps<F> {
  /** Tela dona das visões: "lista-tickets" | "assets". */
  screen: string;
  /** Lê o recorte atual NA HORA de salvar (por isso função, não valor). */
  current: () => F;
  /** Aplica uma visão. `Partial` porque visão salva antes de um filtro existir
   *  continua abrindo — a tela decide o padrão de cada campo ausente. */
  onApply: (filters: Partial<F>) => void;
  /** Exemplo no campo de nome — o único texto que varia por tela. */
  placeholder?: string;
}

const NOME_MAX = 60;

export function SavedViewsMenu<F>({ screen, current, onApply, placeholder }: SavedViewsMenuProps<F>) {
  const toast = useToast();
  const { views, save, remove } = useSavedViews<F>(screen);
  const [aberto, setAberto] = React.useState(false);
  const [nome, setNome] = React.useState('');

  const aplicar = (filters: Partial<F>) => {
    onApply(filters);
    setAberto(false);
  };

  const salvar = async () => {
    const limpo = nome.trim();
    if (!limpo) {
      toast('Dê um nome à visão.', 'danger');
      return;
    }
    try {
      await save(limpo, current());
      setNome('');
      setAberto(false);
      toast(`Visão "${limpo}" salva.`, 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não consegui salvar a visão.', 'danger');
    }
  };

  const apagar = (id: string, nomeDaVisao: string) => {
    void remove(id).then(
      () => toast(`Visão "${nomeDaVisao}" apagada.`, 'success'),
      () => toast('Não consegui apagar a visão.', 'danger'),
    );
  };

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <KitIconButton
        icon={<Bookmark size={16} aria-hidden="true" />}
        label="Visões salvas"
        variant="secondary"
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAberto((o) => !o)}
      />
      <KitMenuPanel
        open={aberto}
        onClose={() => setAberto(false)}
        aria-label="Visões salvas"
        width={288}
        style={{ right: 0 }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)' }}>
          <span style={{ fontSize: 'var(--caption-size)', fontWeight: WEIGHT.semibold, color: 'var(--text-primary)' }}>
            Visões salvas
          </span>
          {views.length > 0 && (
            <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-secondary)' }}>{views.length}</span>
          )}
        </div>

        {views.length === 0 ? (
          <div style={{ padding: '0 var(--space-3) var(--space-2)', fontSize: 'var(--caption-size)', color: 'var(--text-secondary)' }}>
            Nenhuma visão salva ainda. Filtre a tela do jeito que você quer e salve abaixo.
          </div>
        ) : (
          views.map((v) => (
            <KitMenuItem
              key={v.id}
              icon={<Check size={16} aria-hidden="true" />}
              label={v.name}
              onClick={() => aplicar(v.filters)}
              trailing={
                /* Apagar mora na PRÓPRIA linha: um segundo menu "gerenciar
                   visões" seria uma tela a mais para uma lista de no máximo 20. */
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Apagar a visão ${v.name}`}
                  style={{ display: 'inline-flex', color: 'var(--text-secondary)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    apagar(v.id, v.name);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      apagar(v.id, v.name);
                    }
                  }}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </span>
              }
            />
          ))
        )}

        <div style={{ padding: 'var(--space-2) var(--space-3)', borderTop: views.length ? '1px solid var(--border-subtle)' : undefined, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-secondary)' }}>
            Salvar o recorte atual como visão
          </span>
          <KitInput
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void salvar(); }}
            placeholder={placeholder}
            aria-label="Nome da visão"
            maxLength={NOME_MAX}
          />
          <KitButton size="xs" onClick={() => { void salvar(); }}>Salvar visão</KitButton>
        </div>
      </KitMenuPanel>
    </span>
  );
}
