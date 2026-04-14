import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

const md = new MarkdownIt({
  html: false, // we sanitize separately
  linkify: true,
  typographer: true
});

/**
 * Render Markdown to safe HTML.
 * @param {string} text
 * @returns {string}
 */
export function renderMarkdown(text) {
  const rawHtml = md.render(text);
  const cleanHtml = sanitizeHtml(rawHtml, {
    allowedTags: [
      'p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'code', 'pre',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'span', 'div'
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target'],
      img: ['src', 'alt', 'title'],
      code: ['class'],
      pre: ['class'],
      span: ['class'],
      div: ['class']
    }
  });
  return cleanHtml;
}