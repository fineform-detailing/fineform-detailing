import { writeFile, mkdir } from 'node:fs/promises';

/**
 * Ship one new, freely licensed editorial photo with the site itself.
 * Reference: https://www.pexels.com/photo/person-cleaning-a-black-car-4870700/
 * Photographer: Kaboompics (Pexels License).
 *
 * Cloudflare Workers assets are self-hosted; visitors never need to load images
 * from a third-party domain and the CSP remains restricted to 'self'.
 */
const CDN = 'https://images.pexels.com/photos/4870700/pexels-photo-4870700.jpeg';

async function imageVariant(width, height, destination) {
  const params = new URLSearchParams({
    auto: 'compress',
    cs: 'tinysrgb',
    fit: 'crop',
    w: String(width),
    h: String(height),
    q: '76'
  });
  const url = CDN + '?' + params.toString();
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: 'image/jpeg,image/*;q=0.8' }
  });
  if (!response.ok) throw new Error('Não foi possível obter a nova foto do Pexels (HTTP ' + response.status + ').');
  const contentType = response.headers.get('content-type') || '';
  if (!/^image\/jpeg\b/i.test(contentType)) {
    throw new Error('O Pexels não retornou um JPEG válido: ' + contentType);
  }
  const data = new Uint8Array(await response.arrayBuffer());
  if (data.length < 1000 || data.length > 6_000_000 || data[0] !== 0xff || data[1] !== 0xd8) {
    throw new Error('Imagem da capa ausente, inválida ou inesperadamente grande.');
  }
  await writeFile(destination, data);
}

export async function prepareHeroPhoto() {
  await mkdir('dist/assets', { recursive: true });
  await Promise.all([
    imageVariant(933, 1400, 'dist/assets/hero-detail-wash.jpg'),
    imageVariant(560, 840, 'dist/assets/hero-detail-wash-mobile.jpg'),
  ]);
}
