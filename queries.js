const init = (connection) => {
  const insertProtocol = async (data) => {
    const conn = await connection;
    const [result] = await conn.query(
      `insert into protocol (protocolNumber, senderVerifiedName, senderId, datetime, \`option\`) VALUES (?,?,?,?,?)`,
      data
    );
    return result;
  };

  const insertIteraction = async (data) => {
    const conn = await connection;
    const [result] = await conn.query(
      `insert into interaction (codLevel, codOption, dateTime, codProtocol) VALUES (?,?,?,?)`,
      data
    );

    return result;
  };

  const findProtocol = async (senderId) => {
    const conn = await connection;
    const [results] = await conn.query(
      `select * from protocol where senderId = ?`,
      senderId
    );
    return results;
  };

  const findAllOpenProtocols = async () => {
    const conn = await connection;
    const [results] = await conn.query(
      `select * from protocol where endedAt is null`
    );
    return results;
  };

  const findLastProtocol = async (senderId) => {
    const conn = await connection;
    const [results] = await conn.query(
      `select * from protocol where senderId = ? order by codProtocol DESC LIMIT 1`,
      senderId
    );
    return results;
  };

  const findLastIteraction = async (protocolId) => {
    const conn = await connection;
    const [results] = await conn.query(
      `select * from interaction where codProtocol = ? ORDER BY codInteraction DESC LIMIT 1`,
      protocolId
    );
    return results;
  };

  const updateProtocolOption = async (protocolId, option) => {
    const conn = await connection;
    await conn.query(
      `update protocol set \`option\` = ? where codProtocol = ?`,
      [option, protocolId]
    );
  };

  return {
    insertProtocol,
    insertIteraction,
    findProtocol,
    findLastProtocol,
    findLastIteraction,
    updateProtocolOption,
    findAllOpenProtocols,
  };
};

module.exports = init;
