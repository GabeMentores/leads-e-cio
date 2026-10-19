import * as React from 'react';
import { KitMenuPanel, KitMenuItem } from './index';

/**
 * KitTemplateEditor — campo de texto com ETIQUETAS de campo (autorizado pelo
 * user em 2026-09-08: "tipo Telegram, quando digita / ele sugere").
 *
 * A pessoa escreve a mensagem e, ao digitar "/" (ou "{"), escolhe um campo
 * pelo RÓTULO ("SLA consumido"); ele entra como etiqueta no texto. O que fica
 * gravado é `{chave}` — o que o motor interpola — e a pessoa nunca vê a chave.
 * A prévia (como o destinatário lê) é da TELA, por `renderTemplatePreview` —
 * o user (2026-09-08) quis a instrução logo abaixo do campo e a prévia num
 * contêiner com cara de mensagem, sem botão de inserir.
 *
 * Por baixo é um `contenteditable` (a etiqueta é um <span> não editável);
 * `value` é a fonte da verdade: o DOM é re-renderizado dela só quando o campo
 * não está em foco, para o cursor não pular a cada tecla.
 */
export interface KitTemplateField {
  key: string;
  label: string;
  /** Valor de exemplo para a prévia (ex.: "#4218", "82%"). */
  sample?: string;
}
export interface KitTemplateEditorProps {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  fields: KitTemplateField[];
  placeholder?: string;
  minRows?: number;
  disabled?: boolean;
  invalid?: boolean;
  'aria-label'?: string;
}

const TOKEN = /(\{[A-Za-z0-9_]+\})/;
const TOKEN_KEY = /^\{([A-Za-z0-9_]+)\}$/;

function chipNode(key: string, label: string): HTMLSpanElement {
  const s = document.createElement('span');
  s.dataset.chip = key;
  s.contentEditable = 'false';
  s.textContent = label;
  // Mesmo desenho do KitBadge brand (pílula, superfície brand-subtle, texto forte).
  Object.assign(s.style, {
    display: 'inline-block', margin: '0 2px', padding: '0 8px', lineHeight: '20px',
    borderRadius: 'var(--radius-pill)', background: 'var(--surface-brand-subtle)',
    color: 'var(--text-brand-strong)', fontSize: 'var(--caption-size)', fontWeight: '600',
    verticalAlign: 'baseline', whiteSpace: 'nowrap', userSelect: 'all',
  } as Partial<CSSStyleDeclaration>);
  return s;
}

function serialize(root: HTMLElement): string {
  let out = '';
  const walk = (n: Node) => {
    n.childNodes.forEach((c) => {
      if (c.nodeType === Node.TEXT_NODE) { out += c.textContent ?? ''; return; }
      if (!(c instanceof HTMLElement)) return;
      if (c.dataset.chip) { out += `{${c.dataset.chip}}`; return; }
      if (c.tagName === 'BR') { out += '\n'; return; }
      if (c.tagName === 'DIV' && out && !out.endsWith('\n')) out += '\n';
      walk(c);
    });
  };
  walk(root);
  return out.replace(/\n$/, '');
}

function render(root: HTMLElement, value: string, labelOf: (k: string) => string) {
  root.innerHTML = '';
  for (const part of value.split(TOKEN)) {
    const m = TOKEN_KEY.exec(part);
    if (m) { root.appendChild(chipNode(m[1], labelOf(m[1]))); continue; }
    if (!part) continue;
    part.split('\n').forEach((line, i) => {
      if (i > 0) root.appendChild(document.createElement('br'));
      if (line) root.appendChild(document.createTextNode(line));
    });
  }
}

/** Texto como o destinatário lê: etiquetas viram os valores de exemplo. */
export function renderTemplatePreview(value: string, fields: KitTemplateField[]): string {
  return value.replace(/\{([A-Za-z0-9_]+)\}/g, (_m, k: string) => {
    const f = fields.find((x) => x.key === k);
    return f?.sample ?? f?.label ?? k;
  });
}

export function KitTemplateEditor({
  id, value, onChange, fields, placeholder, minRows = 3, disabled = false, invalid = false,
  'aria-label': ariaLabel,
}: KitTemplateEditorProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [focus, setFocus] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [highlight, setHighlight] = React.useState(0);
  // O ✓ do item só aparece quando a pessoa navega pelo teclado — no mouse, o
  // hover já diz onde ela está, e um ✓ leria como "selecionado".
  const [porTeclado, setPorTeclado] = React.useState(false);
  // Onde o "/" foi digitado (nó de texto + posição) — é o que a escolha substitui.
  const trigger = React.useRef<{ node: Text; offset: number } | null>(null);
  const labelOf = React.useCallback((k: string) => fields.find((f) => f.key === k)?.label ?? k, [fields]);

  // value → DOM, só quando o campo não está em foco (o cursor não pula).
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (serialize(el) !== value) render(el, value, labelOf);
  }, [value, labelOf]);

  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const lista = query ? fields.filter((f) => norm(f.label).includes(norm(query))) : fields;

  const fechar = () => { setOpen(false); setQuery(''); setHighlight(0); setPorTeclado(false); trigger.current = null; };

  const caret = (): { node: Text; offset: number } | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !ref.current) return null;
    const r = sel.getRangeAt(0);
    if (!ref.current.contains(r.startContainer)) return null;
    let node: Node = r.startContainer;
    let offset = r.startOffset;
    // Editor vazio ou cursor "entre nós": a seleção aponta para o próprio
    // contêiner — o texto relevante é o nó imediatamente antes do cursor.
    if (node.nodeType !== Node.TEXT_NODE) {
      const antes = node.childNodes[offset - 1];
      if (!antes || antes.nodeType !== Node.TEXT_NODE) return null;
      node = antes;
      offset = (antes.textContent ?? '').length;
    }
    return { node: node as Text, offset };
  };

  const onInput = () => {
    const el = ref.current;
    if (!el) return;
    onChange(serialize(el));
    const c = caret();
    if (open && trigger.current) {
      // Ainda no mesmo nó e depois do gatilho? Senão, a lista some.
      if (!c || c.node !== trigger.current.node || c.offset <= trigger.current.offset) { fechar(); return; }
      setQuery(c.node.textContent?.slice(trigger.current.offset + 1, c.offset) ?? '');
      setHighlight(0);
      return;
    }
    if (c && c.offset > 0) {
      // Procura o último "/" ou "{" antes do cursor sem espaço no meio — vale
      // para tecla a tecla e para texto colado de uma vez.
      const antes = (c.node.textContent ?? '').slice(0, c.offset);
      const pos = Math.max(antes.lastIndexOf('/'), antes.lastIndexOf('{'));
      if (pos >= 0 && !/\s/.test(antes.slice(pos + 1))) {
        trigger.current = { node: c.node, offset: pos };
        setQuery(antes.slice(pos + 1)); setHighlight(0); setOpen(true);
      }
    }
  };

  const inserir = (f: KitTemplateField) => {
    const el = ref.current;
    if (!el) return;
    const chip = chipNode(f.key, f.label);
    const espaco = document.createTextNode(' ');
    const t = trigger.current;
    const sel = window.getSelection();
    if (t && t.node.parentNode) {
      // Substitui "/consulta" pela etiqueta.
      const texto = t.node.textContent ?? '';
      const c = caret();
      const fim = c && c.node === t.node ? c.offset : texto.length;
      t.node.textContent = texto.slice(0, t.offset);
      const resto = document.createTextNode(texto.slice(fim));
      t.node.after(chip, espaco, resto);
    } else {
      // Sem gatilho (botão): no cursor se ele estiver aqui, senão no fim.
      const c = caret();
      if (c) {
        const r = document.createRange();
        r.setStart(c.node, c.offset); r.collapse(true);
        r.insertNode(espaco); r.insertNode(chip);
      } else {
        el.append(chip, espaco);
      }
    }
    // Cursor logo depois da etiqueta.
    if (sel) {
      const r = document.createRange();
      r.setStart(espaco, 1); r.collapse(true);
      sel.removeAllRanges(); sel.addRange(r);
    }
    el.focus();
    onChange(serialize(el));
    fechar();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setPorTeclado(true); setHighlight((h) => Math.min(lista.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setPorTeclado(true); setHighlight((h) => Math.max(0, h - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (lista[highlight]) inserir(lista[highlight]); }
    else if (e.key === 'Escape') { e.preventDefault(); fechar(); }
  };

  const border = invalid ? 'var(--red-500)' : focus ? 'var(--border-brand)' : 'var(--border-default)';
  const vazio = value.trim().length === 0;

  return (
    <div style={{ position: 'relative' }}>
        {/* Placeholder próprio: contenteditable não tem o nativo. */}
        {vazio && !focus && placeholder && (
          <span aria-hidden="true" style={{ position: 'absolute', left: 14, top: 12, fontSize: 'var(--body-md-size)', color: 'var(--text-muted)', pointerEvents: 'none', fontFamily: 'var(--font-body)' }}>
            {placeholder}
          </span>
        )}
        <div
          id={id}
          ref={ref}
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
          contentEditable={!disabled}
          suppressContentEditableWarning
          onInput={onInput}
          onKeyDown={onKeyDown}
          onFocus={() => setFocus(true)}
          onBlur={() => { setFocus(false); window.setTimeout(fechar, 150); }}
          style={{
            width: '100%', boxSizing: 'border-box', minHeight: `${minRows * 24 + 24}px`, padding: '12px 14px',
            background: disabled ? 'var(--surface-subtle)' : 'var(--surface-card)',
            border: `1px solid ${border}`, borderRadius: 'var(--radius-sm)',
            boxShadow: focus ? 'var(--focus-ring)' : 'none', outline: 'none', transition: 'var(--transition-control)',
            fontFamily: 'var(--font-body)', fontSize: 'var(--body-md-size)', lineHeight: 1.5,
            color: 'var(--text-primary)', letterSpacing: 'var(--control-tracking)', opacity: disabled ? 0.6 : 1,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}
        />
        <KitMenuPanel open={open && lista.length > 0} onClose={fechar} width={280} aria-label="Campos disponíveis">
          {lista.map((f, i) => (
            <KitMenuItem
              key={f.key}
              label={f.label}
              checked={porTeclado ? i === highlight : undefined}
              trailing={f.sample ? <span style={{ fontSize: 'var(--caption-size)', color: 'var(--text-muted)' }}>{f.sample}</span> : undefined}
              onClick={() => inserir(f)}
            />
          ))}
        </KitMenuPanel>
    </div>
  );
}
