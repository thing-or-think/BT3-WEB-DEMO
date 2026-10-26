export function detectLanguage(filename = '') {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'py') return 'Python';
  if (ext === 'js' || ext === 'ts') return 'JavaScript';
  if (ext === 'cpp' || ext === 'c' || ext === 'h') return 'C++';
  if (ext === 'java') return 'Java';
  if (ext === 'html' || ext === 'css') return 'HTML/CSS';
  return 'Code';
}

export function getLangClass(lang = '') {
  if (lang === 'Python') return 'lang-python';
  if (lang === 'JavaScript') return 'lang-js';
  if (lang === 'C++') return 'lang-cpp';
  return 'lang-other';
}

export function getLangIcon(lang = '') {
  if (lang === 'Python') return '🐍';
  if (lang === 'JavaScript') return '⚡';
  if (lang === 'C++') return '🚀';
  if (lang === 'Java') return '☕';
  if (lang === 'HTML/CSS') return '🌐';
  return '📄';
}
