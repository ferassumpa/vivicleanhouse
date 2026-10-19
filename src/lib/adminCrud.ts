/** Mensagem amigável para erros de FK ao excluir */
export function deleteErrorMessage(error: { code?: string; message?: string } | null, entity: string) {
  if (!error) return `${entity} não pôde ser excluído.`
  if (
    error.code === '23503' ||
    error.message?.toLowerCase().includes('foreign key') ||
    error.message?.toLowerCase().includes('violates foreign key')
  ) {
    return `Não dá para excluir este ${entity}: existem faxinas ou outros registros vinculados. Desative-o ou exclua os vínculos antes.`
  }
  return error.message || `Erro ao excluir ${entity}.`
}
