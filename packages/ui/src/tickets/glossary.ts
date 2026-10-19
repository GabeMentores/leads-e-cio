import { useProfile } from '../profile/store';
import type { Profile } from '@bela/types';

/**
 * GLOSSÁRIO POR PERSONA (regra do dono, 2026-08-27; §6.11 do HANDOFF elevada a
 * regra de produto): na cadeira do COLABORADOR tudo é **chamado**; na do
 * analista, gestor ou admin tudo é **ticket** — título de página, item de menu,
 * estados vazios, fala da bela. Não é sinônimo solto: é o vocabulário de cada
 * lado do balcão, e trocar um pelo outro faz a tela falar a língua errada.
 *
 * Colaborador é quem NÃO opera o service desk. Aprovador vê "ticket": ele está
 * do lado de dentro do processo (decide o que a operação vai executar).
 */
export interface Glossary {
  /** "chamado" | "ticket" */
  term: string;
  /** "chamados" | "tickets" */
  plural: string;
  /** "Chamado" | "Ticket" */
  Term: string;
  /** "Chamados" | "Tickets" */
  Plural: string;
  /** true quando a persona opera o service desk (fala "ticket"). */
  agent: boolean;
}

export function glossaryFor(profile: Profile): Glossary {
  const agent = profile !== 'end_user';
  return agent
    ? { term: 'ticket', plural: 'tickets', Term: 'Ticket', Plural: 'Tickets', agent: true }
    : { term: 'chamado', plural: 'chamados', Term: 'Chamado', Plural: 'Chamados', agent: false };
}

/** Vocabulário da persona logada. Reage à troca no switcher. */
export function useGlossary(): Glossary {
  const { backend } = useProfile();
  return glossaryFor(backend);
}
