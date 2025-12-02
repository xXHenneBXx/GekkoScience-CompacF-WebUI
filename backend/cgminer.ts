import { createConnection, Socket } from 'net';

export function createCGMinerConnection(host: string, port: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port }, () => {
      resolve(socket);
    });

    socket.on('error', (error) => {
      reject(error);
    });

    setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 10000);
  });
}

export async function sendCGMinerCommand(host: string, port: number, command: string): Promise<any> {
  const socket = await createCGMinerConnection(host, port);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new Error('Command timeout'));
    }, 10000);

    let response = '';

    socket.on('data', (data) => {
      response += data.toString();

      if (response.includes('\0')) {
        clearTimeout(timeout);
        socket.destroy();

        const cleaned = response.replace(/\0/g, '').trim();
        try {
          const parsed = JSON.parse(cleaned);
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Failed to parse CGMiner response: ${cleaned}`));
        }
      }
    });

    socket.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    const payload = JSON.stringify({ command }) + '\n';
    socket.write(payload);
  });
}
