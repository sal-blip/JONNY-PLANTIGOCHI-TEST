export const scenes = {
  denim: 'Stonewashed Pocket',
  raked: 'Raked Sand',
  stillwater: 'Still Water',
  clouds: 'Cotton Clouds',
  shoji: 'Shoji Morning',
  pebbles: 'Pebble Garden',
};

const previousScenes = { pocket:'denim', sand:'raked', water:'stillwater', sky:'clouds', forest:'shoji' };
export const photoZoom = 1.12;
export const photoLimit = 560000;
export const backupLimit = photoLimit + 16384;

export function selectedScene(plant) {
  const id = plant.scene;
  if (id === 'photo' && plant.photo) return id;
  if (typeof id !== 'string') return 'denim';
  if (Object.hasOwn(scenes, id)) return id;
  return Object.hasOwn(previousScenes, id) ? previousScenes[id] : 'denim';
}

export function validPhoto(photo) {
  return photo && typeof photo.src === 'string' && photo.src.length <= photoLimit &&
    /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+=*$/.test(photo.src) &&
    [photo.width, photo.height].every(n => Number.isInteger(n) && n > 0 && n <= 1600) &&
    [photo.x, photo.y].every(n => Number.isFinite(n) && n >= 0 && n <= 100);
}

export function photoStyle(photo) {
  const position = photo.x + '% ' + photo.y + '%';
  return { objectPosition: position, transformOrigin: position, transform: 'scale(' + photoZoom + ')' };
}

export async function preparePhoto(file) {
  // Only the canvas JPEG is retained, so the original and its metadata stay out of saves.
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    for (const edge of [1600, 1280, 1024, 800]) {
      const ratio = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#efeeda';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(image,0,0,canvas.width,canvas.height);
      const src = canvas.toDataURL('image/jpeg', 0.8);
      const photo = {src, width:canvas.width, height:canvas.height, x:50, y:50};
      if (validPhoto(photo)) return photo;
    }
    throw new Error('Image could not be saved.');
  } finally { URL.revokeObjectURL(url); }
}
