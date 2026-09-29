export type StoredVideoRef = {
  id: string;
  name: string;
  type: string;
  duration: number;
};

export async function saveVideoBlob(_id: string, _blob: Blob) {
  throw new Error('El almacenamiento de video se habilitará en la versión móvil nativa.');
}

export async function getVideoBlob(_id: string): Promise<Blob | null> {
  return null;
}

export async function deleteVideoBlob(_id: string) {
  return;
}
