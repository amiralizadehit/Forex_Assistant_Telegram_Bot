import { Telegraf } from "telegraf";

const bot = new Telegraf("1601399988:AAETMLNaYjX-ubOURdvF5IOUPg0yHMHseow");

/*
bot.use((ctx, next)=>{
    ctx.reply("dd");
});
*/
//let ctxObj:any;

let equity: number = -1;
let risk: number = -1;

bot.command("equity", (ctx) => {
  equity = parseFloat(ctx.message.text.split(" ")[1]);
  if (!equity) {
    ctx.reply(
      "Please enter a valid equity following a space after /equity command."
    );
    equity = -1;
  } else {
    if (equity < 0) {
      ctx.reply("Equity should be a positive number.");
      equity = -1;
    } else {
      ctx.reply(`Equity updated to ${equity}.`);
    }
  }
});

bot.command("risk", (ctx) => {
  risk = parseFloat(ctx.message.text.split(" ")[1]);
  if (!risk) {
    ctx.reply(
      "Please enter a valid risk following a space after /risk command."
    );
    risk = -1;
  } else {
    if (risk < 0) {
      ctx.reply("Risk should be a positive number.");
      risk = -1;
    } else {
      ctx.reply(`Risk updated to ${risk}%.`);
    }
  }
});

bot.on("text", (ctx) => {
  let lines = ctx.message.text.split("\n");
  lines = lines.filter((line) => {
    return line !== "";
  });
  //ctxObj =ctx;

  //const numLines = lines.length;
  const headLineWords = lines[0].replace(/  +/g, " ").split(" ");
  const symbol = headLineWords[0].toLowerCase();
  const operation = headLineWords[1];
  const price = parseFloat(headLineWords[2]);

  const tps: Array<number> = [];
  let sl: number = -1;

  lines.forEach((line, index) => {
    if (index === 0) return;
    if (line.toLowerCase().includes("tp")) {
      tps.push(getSLAndTPFromLine(line));
    } else if (
      line.toLowerCase().includes("sl") ||
      line.toLowerCase().includes("stop")
    ) {
      sl = getSLAndTPFromLine(line);
    }
  });

  ctx.reply(
    `${formSummaryMessage(symbol, operation, price, tps, sl)}` +
      `==========\n` +
      `${formAccountInfoMessage()}` +
      `==========\n` +
      `${formPositionSizingMessage(symbol, price, sl)}`
  );
});

function removeWhiteSpaces(message: string) {
  return message.replace(/ /g, "");
}

function getSLAndTPFromLine(tpLine: string): number {
  let tpLineWords: any[];
  if (tpLine.includes(":")) {
    tpLine = removeWhiteSpaces(tpLine);
    tpLineWords = tpLine.split(":");
  } else {
    tpLineWords = tpLine.split(" ");
  }

  if (tpLineWords[1].toLowerCase() === "open") {
    return -1;
  } else {
    return parseFloat(tpLineWords[1]);
  }
}

function formSummaryMessage(
  symbol: string,
  operation: string,
  price: number,
  tps: Array<number>,
  sl: number
): string {
  return (
    `Symbol: ${symbol.toUpperCase()}\n` +
    `Operation: ${operation}\n` +
    `Price: ${price}\n` +
    `TP: ${tps.join(", ")}\n` +
    `SL: ${sl === -1 ? "undefined" : sl}\n`
  );
}
function formAccountInfoMessage(): string {
  return (
    `Equity: ${equity === -1 ? "Not set" : equity}\n` +
    `Risk: ${risk === -1 ? "Not set" : risk + "%"}\n`
  );
}
function formPositionSizingMessage(
  symbol: string,
  price: number,
  sl: number
): string {
  if (equity === -1 || risk === -1) {
    return `Volume: Error - Either equity or risk is not set`;
  } else {
    let volume = getTradeVolume(symbol, price, sl);
    let result: string;
    if (volume === -1) {
      result = "Volume: Error - Not supported for this currency";
    } else if (volume < 0.01) {
      result =
        `Volume: ${volume.toFixed(2)} \n` +
        `Minimum Risk: ${((0.01 * risk) / volume).toFixed(2)}%`;
    } else {
      result = `Volume: ${volume.toFixed(2)}`;
    }
    return result;
  }
}

function getTradeVolume(symbol: string, price: number, sl: number): number {
  let pipDiff: number;
  let riskPerPip: number;
  if (symbol.includes("usd")) {
    pipDiff = getDiffInPip(symbol, price, sl);
    riskPerPip = (equity * risk) / 100 / pipDiff;

    const usdIndex = symbol.indexOf("usd");
    if (usdIndex === 0) {
      return riskPerPip / 10 / price;
    } else if (usdIndex === 3) {
      return riskPerPip / 10;
    }
  } else if (symbol.includes("gold")) {
    pipDiff = getDiffInPip(symbol, price, sl);
    riskPerPip = (equity * risk) / 100 / pipDiff;
    return riskPerPip / 10;
  }
  return -1;
}

function getDiffInPip(symbol: string, price: number, sl: number): number {
  let digit = 1;
  switch (symbol) {
    case "gold":
      digit = 1;
      break;
    case "usdjpy":
      digit = 1;
      break;
    default:
      digit = 3;
      break;
  }
  return Math.abs(price - sl) * Math.pow(10, digit);
}

bot.launch();
