// Supports ES6
// import { create, Whatsapp } from 'venom-bot';

const express = require("express");
const app = express();
const cors = require("cors");

const {
  welcome,
  invalidOption,
  level1Option1,
  level1Option2,
  level1Option3,
  level1Option4,
  waitForAttendance,
} = require("./texts");

const connection = require("./connection");
const queries = require("./queries")(connection);

const venom = require("venom-bot");
let currentClient;

venom.create().then((client) => start(client));

async function start(client) {
  currentClient = client;

  client.onStateChange((state) => {
    console.log(state);
    const conflits = [
      venom.SocketState.CONFLICT,
      venom.SocketState.UNPAIRED,
      venom.SocketState.UNLAUNCHED,
    ];
    if (conflits.includes(state)) {
      client.useHere();
    }
  });

  await client.onMessage(async (message) => {
    console.log(message);
    // Identificar quem esta enviando a mensagem
    const senderId = message.sender.id;

    // Data
    const todayClass = new Date();
    const today =
      todayClass.getFullYear() +
      "-" +
      todayClass.getMonth() +
      "-" +
      todayClass.getDay() +
      " " +
      todayClass.getHours() +
      ":" +
      todayClass.getMinutes() +
      ":" +
      todayClass.getSeconds();

    // ver se ele já tem um protocolo
    const protocol = await queries.findLastProtocol(senderId);

    if (protocol.length === 0) {
      // se não tem um protocolo, grava um e define o menu para main
      console.log("ETAPA 1 - Não tem protocolo, gravando e enviando para main");
      const insertedPrococolId = await newProtocol(message, today);
      await main(today, client, message, insertedPrococolId.insertId);
    } else {
      console.log("Tem protocolo...");

      // se ta tem, ve se esta fechado
      if (protocol[0].endedAt === null) {
        console.log("Protocolo aberto, vendo ultima interação...");
        // se está aberto ver ultima interação
        const lastIteraction = await findLastIteraction(protocol);

        if (lastIteraction.length === 0) {
          console.log(
            "ETAPA 2 - não existe interação, gravando uma e enviando para main"
          );
          // se não existe interação, cria uma e envia para main
          await main(today, client, message, protocol[0].codProtocol);
        } else {
          console.log("ETAPA 3 - Existe interação, gravando nova");

          // grava o ID da mensagem
          console.log(protocol[0].option);

          // Se existe, envia para menu correto
          switch (protocol[0].option) {
            case "main":
              client.startTyping(message.from);
              client.sendText(
                message.from,
                "Olá " + message.sender.verifiedName + "!"
              );
              client.sendText(message.from, welcome);
              break;
            case "level1":
              await level1Menu(today, protocol, client, message);
              break;
            case "level2":
              await level2Menu(today, protocol, client, message);
              break;
          }
        }
      } else {
        // inserir novo protocolo e enviar para main
        console.log("inserir novo protocolo e enviar para main");
        const insertedPrococolId = await newProtocol(message, today);
        await main(today, client, message, insertedPrococolId.insertId);
      }
    }
  });
}

async function main(today, client, message, protocolId) {
  client.startTyping(message.from);
  client.sendText(message.from, "Olá " + message.sender.verifiedName + "!");
  client.sendText(message.from, welcome);
  await newIteraction(1, 1, today, protocolId);
  await updateProtocolOption(protocolId, "level1");
}

async function level1Menu(today, protocol, client, message) {
  const intSelectedOption = Number.isInteger(Number.parseInt(message.body));

  if (intSelectedOption) {
    selectedOption = Number.parseInt(message.body);
    if (selectedOption < 4) {
      if (selectedOption === 0) {
        client.sendText(message.from, welcome);
        return;
      }
      await newIteraction(2, selectedOption, today, protocol[0].codProtocol);
      await updateProtocolOption(protocol[0].codProtocol, "level2");
      await loadLevel1Menu(selectedOption, message, client);
    } else {
      client.sendText(message.from, invalidOption);
      client.sendText(message.from, welcome);
    }
  } else {
    client.sendText(message.from, invalidOption);
    client.sendText(message.from, welcome);
  }
}

async function level2Menu(today, protocol, client, message) {
  await updateProtocolOption(protocol[0].codProtocol, "level3");
  if (message.body === "*") {
    client.sendText(message.from, "Retornando para menu anterior...");
    await loadLevel1Menu(level1Option, message, client);
    return;
  } else if (message.body === "0") {
    client.sendText(message.from, "Retornando para menu principal...");
    await main(client, message);
  } else {
    client.sendText(message.from, waitForAttendance);
    await newIteraction(
      3,
      Number.parseInt(message.body),
      today,
      protocol[0].codProtocol
    );
  }
}

async function loadLevel1Menu(selectedOption, message, client) {
  client.startTyping(message.from);
  switch (selectedOption) {
    case 1:
      client.sendText(message.from, level1Option1);
      break;
    case 2:
      client.sendText(message.from, level1Option2);
      break;
    case 3:
      client.sendText(message.from, level1Option3);
      break;
    case 4:
      client.sendText(message.from, level1Option4);
      break;
  }
  level1Option = selectedOption;
}

async function newProtocol(message, today) {
  let name;
  if (message.sender.verifiedName) {
    name = message.sender.verifiedName;
  } else {
    name = message.sender.formattedName;
  }
  return await queries
    .insertProtocol([1, name, message.sender.id, today, "level1"])
    .then()
    .catch((error) => console.log(error));
}

async function newIteraction(codLevel, codOption, today, protocolId) {
  return await queries
    .insertIteraction([codLevel, codOption, today, protocolId])
    .then()
    .catch((error) => console.log(error));
}

async function findLastIteraction(protocol) {
  return await queries
    .findLastIteraction(protocol[0].codProtocol)
    .then()
    .catch((error) => console.log(error));
}

async function updateProtocolOption(protocolId, option) {
  return await queries
    .updateProtocolOption(protocolId, option)
    .then()
    .catch((error) => console.log(error));
}

async function findAllOpenProtocols() {
  return await queries
    .findAllOpenProtocols()
    .then()
    .catch((error) => console.log(error));
}

app.use(cors());

app.get("/", (req, res) => {
  res.send("ok");
});

app.get("/mensagem", (req, res) => {
  currentClient.sendText("553193770539@c.us", "teste de envio");
});

app.get("/open-protocols", async (req, res) => {
  const protocols = await findAllOpenProtocols();
  const chats = protocols.map((protocol) => {
    return {
      id: protocol.codProtocol,
      name: protocol.senderVerifiedName,
      number: protocol.senderId,
      pic: "images/asdsd12f34ASd231.png",
      lastSeen: protocol.datetime,
    };
  });

  res.json(chats);
});

app.get("test-json-user", (req, res) => {
  let user = {
    id: 0,
    name: "Anish",
    number: "+91 91231 40293",
    pic: "images/asdsd12f34ASd231.png",
  };

  res.json(user);
});

app.listen(3001, "localhost");
