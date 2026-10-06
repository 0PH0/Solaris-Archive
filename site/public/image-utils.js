const escapeAttribute = value => String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');

// Encore detail records sometimes return Unreal asset paths rather than URLs.
// Convert only paths supplied by the API; never guess larger asset filenames.
export function encoreImageUrl(value) {
  if (typeof value !== 'string') return '';
  if (/^https:\/\/api\.encore\.moe\/resource\//.test(value)) return value;
  if (!/^\/Game\/[\w/.-]+$/.test(value) || value.includes('..')) return '';
  return 'https://api.encore.moe/resource/Data/Game/' + value.slice(6).split('.')[0] + '.webp';
}

export function imageAttributes(sources, {srcset, sizes, width, height} = {}) {
  const [src = '', ...fallbacks] = [...new Set(sources.filter(Boolean))];
  let attributes = `src="${escapeAttribute(src)}" data-image-fallbacks="${escapeAttribute(JSON.stringify(fallbacks))}"`;
  if (srcset) attributes += ` srcset="${escapeAttribute(srcset)}" sizes="${escapeAttribute(sizes || '100vw')}"`;
  if (width && height) attributes += ` width="${width}" height="${height}"`;
  return attributes;
}

export function setImageSources(image, sources) {
  const [src, ...fallbacks] = [...new Set(sources.filter(Boolean))];
  if (!src || image.getAttribute('src') === src) return;
  image.removeAttribute('srcset');
  image.removeAttribute('sizes');
  image.dataset.imageFallbacks = JSON.stringify(fallbacks);
  image.src = src;
}

export function installImageFallbacks(root = document) {
  root.addEventListener('load', event => {
    const image = event.target;
    if (image.tagName !== 'IMG' || !image.dataset.imageFallbacks || image.src.startsWith('data:image/svg+xml,')) return;
    image.closest('.avatar')?.classList.remove('avatar--fallback');
    image.parentElement?.classList.remove('is-fallback');
  }, true);
  // Error doesn't bubble. Capture also handles images created by later renders.
  root.addEventListener('error', event => {
    const image = event.target;
    if (image.tagName !== 'IMG' || !image.dataset.imageFallbacks) return;
    let sources;
    try {sources = JSON.parse(image.dataset.imageFallbacks);} catch {return;}
    const original = image.hasAttribute('srcset') && image.currentSrc !== image.src ? image.getAttribute('src') : '';
    const next = original || sources.shift();
    image.dataset.imageFallbacks = JSON.stringify(sources);
    if (!next) return;
    // Otherwise the browser keeps selecting the broken responsive candidate.
    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
    if (!sources.length && next.startsWith('data:image/svg+xml,')) {
      image.closest('.avatar')?.classList.add('avatar--fallback');
      image.parentElement?.classList.add('is-fallback');
    }
    image.src = next;
  }, true);
}
