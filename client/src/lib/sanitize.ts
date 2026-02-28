import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'hr', 'pre', 'code'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'target', 'width', 'height'],
  });
}
