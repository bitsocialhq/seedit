export const startPkcRpcServer = async ({ PKCRpcModule, port, pkcOptions, authKey, isDev = false, logger = console }) => {
  const pkcWebSocketServer = await PKCRpcModule.PKCWsServer({ port, pkcOptions, authKey });
  pkcWebSocketServer.on('error', (e) => logger.log('pkc rpc error', e));

  logger.log(`pkc rpc: listening on ws://localhost:${port} (local connections only)`);
  logger.log(`pkc rpc: listening on ws://localhost:${port}/${authKey} (secret auth key for remote connections)`);
  pkcWebSocketServer.ws.on('connection', (socket) => {
    logger.log('pkc rpc: new connection');
    // debug raw JSON RPC messages in console
    if (isDev) {
      socket.on('message', (message) => logger.log(`pkc rpc: ${message.toString()}`));
    }
  });

  return pkcWebSocketServer;
};
