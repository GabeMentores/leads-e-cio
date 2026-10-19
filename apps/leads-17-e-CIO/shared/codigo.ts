// Normalização do código da roleta — compartilhada entre o front (campo do
// validador) e a API. A GERAÇÃO fica só no servidor (server/handlers.ts).
export function normalizarCodigo(bruto: string): string {
  return bruto.trim().toUpperCase().replace(/[\s-]/g, '');
}
