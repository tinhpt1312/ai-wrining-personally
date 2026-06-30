function toAsciiFallback(fileName: string): string {
  const fallback = fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.\- ()[\]]/g, '_')
    .replace(/"/g, '_')
    .trim()
    .slice(0, 100);

  return fallback || 'download';
}

export function buildAttachmentDisposition(fileName: string): string {
  const asciiName = toAsciiFallback(fileName);
  const utf8Name = encodeURIComponent(fileName).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `attachment; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`;
}
