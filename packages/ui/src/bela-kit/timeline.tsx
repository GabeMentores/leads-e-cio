/**
 * Histórico de logs — a LINHA DO TEMPO, em uma estética só.
 *
 * Promovido a componente compartilhado em 2026-08-26 (user: "o histórico de
 * logs deve seguir a estética já existente"): a 4.a desenhava a trilha com
 * marcador + rótulo + meta desde sempre, e o drawer 4.b tinha nascido com um
 * layout próprio de duas colunas (data à esquerda). Agora as duas telas
 * renderizam pelo MESMO componente.
 *
 * Ele é só APRESENTAÇÃO: cada tela monta seus eventos, porque as audiências são
 * diferentes — a 4.a fala com o solicitante (vocabulário de 6 rótulos, motivo
 * interno não vaza) e a 4.b fala com quem atende (rótulos de operação, motivo
 * da devolução à vista).
 *
 * MOVIDO para o DS em 2026-09-04, quando a terceira tela (drawer de ativo)
 * precisou da mesma trilha. `note` nasceu aqui: o evento de ativo tem uma
 * terceira linha (o motivo do log / o status do chamado) que o do chamado não
 * tinha.
 */
export interface LogEvent {
  label: string;
  meta: string;
  /** Linha do meio, opcional — o motivo/nota do evento, em corpo de texto. */
  note?: string;
  /** Evento vivo (o estado de agora): marcador e rótulo em cor de atenção. */
  current?: boolean;
}

export function KitLogTimeline({ events }: { events: LogEvent[] }) {
  return (
    <ol className="flex flex-col gap-[var(--space-md)]">
      {events.map((e, i) => (
        <li key={i} className="flex gap-[var(--space-sm)]">
          <span
            className="mt-[6px] h-2 w-2 shrink-0 rounded-[var(--radius-full)]"
            style={{ backgroundColor: e.current ? 'hsl(var(--status-at-risk))' : 'var(--c-border-strong)' }}
          />
          <div className="min-w-0">
            <div
              className={`text-[length:var(--body-sm-size)] font-[var(--weight-medium)] ${
                e.current ? 'text-status-at-risk-fg' : 'text-text-primary'
              }`}
            >
              {e.label}
            </div>
            {e.note && (
              <div className="text-[length:var(--body-sm-size)] text-text-secondary">{e.note}</div>
            )}
            <div className="text-[length:var(--caption-size)] text-text-muted">{e.meta}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
