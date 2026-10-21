export const port = Number(process.env.PORT ?? 3100);
export const origin = `http://127.0.0.1:${port}`;
export const mailDir = `.dev-mail-${port}`;
export const dataDir = `.data/pglite-${port}`;
