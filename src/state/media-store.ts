export type StoredVideoRef = {
  id: string;
  name: string;
  type: string;
  duration: number;
};

export async function saveVideoBlob() {
  throw new Error('El almacenamiento de video se habilitará en la versión móvil nativa.');
}

export async function getVideoBlob() {
  return null;
}

export async function deleteVideoBlob() {
  return;
}
