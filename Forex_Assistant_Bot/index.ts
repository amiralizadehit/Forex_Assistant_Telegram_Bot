import { Telegraf } from "telegraf";
import { BotException, ClientMessage, ExceptionName } from "./src/error";

const token = process.env["TELEGRAM_BOT_TOKEN"];

const webhookAddress = process.env["WEBHOOK_ADDRESS"];
if (token === undefined) {
  throw new Error("TELEGRAM_BOT_TOKEN must be provided!");
}
if (webhookAddress === undefined) {
  throw new Error("WEBHOOK_ADDRESS must be provided!");
}

const bot = new Telegraf(token, {
  telegram: { webhookReply: true },
});

bot.telegram.setWebhook(webhookAddress);

/*
bot.use((ctx, next)=>{
    ctx.reply("dd");
});
*/
//let ctxObj: any;

let equity: number = -1;
let risk: number = 0.01;
let ratio: number = -1;

bot.command("start", (ctx) => {
  ctx.reply(
    "Hi! Please set your equity and risk first.\n\n" +
      "/equity [YOUR EQUITY]\n" +
      "/risk [YOUR RISK(%)]\n\n" +
      "Then, send your signal in one of the following formats:\n"
  );
  ctx.reply(formSignalCorrectFormatMessage());
});

bot.command("help", (ctx) => {
  ctx.reply(
    "/equity [YOUR EQUITY] - Setting your equity.\n" +
      "/risk [YOUR RISK(%)] - Setting your risk%.\n" +
      "/ratio [CONVERSION RATIO] - Setting conversion ratio"
  );
});

bot.command("ratio", (ctx) => {
  ratio = parseFloat(ctx.message.text.split(" ")[1]);
  if (!ratio) {
    ctx.reply(
      "Please enter a valid conversion ratio following a space after /ratio command."
    );
    ratio = -1;
  } else {
    if (ratio < 0) {
      ctx.reply("Conversion ratio should be a positive number.");
      ratio = -1;
    } else {
      ctx.reply(`Conversion ratio updated to ${ratio}.`);
    }
  }
});

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
      risk = risk / 100;
    }
  }
});
// Signal Processing
// @ts-ignore
bot.on("text", (ctx) => {
  try {
    let lines = ctx.message.text.split("\n");
    lines = lines
      .filter((line: string) => {
        return line !== "";
      })
      .map((line: string) => line.trim());
    //ctxObj = ctx;

    const headLineWords = lines[0].replace(/  +/g, " ").split(" ");
    if (headLineWords.length !== 3) {
      throw new BotException(
        "parser_001",
        ExceptionName.InvalidSignalFormat,
        ClientMessage.InvalidSignal
      );
    }
    const symbol = headLineWords[0].toLowerCase();

    const operation = headLineWords[1].toLowerCase();
    if (operation !== "buy" && operation !== "sell") {
      throw new BotException(
        "parser_002",
        ExceptionName.InvalidOperationFormat,
        ClientMessage.InvalidOperation
      );
    }
    const price = parseFloat(headLineWords[2]);
    if (!price) {
      throw new BotException(
        "parser_003",
        ExceptionName.InvalidPriceFormat,
        ClientMessage.InvalidPrice
      );
    }

    const tps: Array<number> = [];
    let sl: number = -1;

    lines.forEach((line: string, index: number) => {
      if (index === 0) return;
      if (line.toLowerCase().includes("tp")) {
        tps.push(getSLAndTPFromLine(line));
      } else if (
        line.toLowerCase().includes("sl") ||
        line.toLowerCase().includes("stop")
      ) {
        sl = getSLAndTPFromLine(line);
      } else {
        throw new BotException(
          "parser_004",
          ExceptionName.InvalidSignalFormat,
          ClientMessage.InvalidSignal
        );
      }
    });
    if (sl === -1) {
      throw new BotException(
        "parser_006",
        ExceptionName.InvalidSignalFormat,
        ClientMessage.InvalidSignal
      );
    }
    if (tps.length === 0) {
      //if there is no tp specified, we make an open tp (-1) in the array.
      tps[0] = -1;
    }

    ctx.reply(
      `${formSummaryMessage(symbol, operation, price, tps, sl)}` +
        `==========\n` +
        `${formPropMessage()}` +
        `==========\n` +
        `${formPositionSizingMessage(symbol, price, sl, tps)}`
    );
    ratio = -1;
  } catch (error) {
    const errorMessage = error.getClientMessage();
    const errorCode = error.getErrorCode();
    ctx.reply(errorMessage + "\nError code: " + errorCode);
    if (error.getType() === ExceptionName.InvalidSignalFormat) {
      ctx.reply(formSignalCorrectFormatMessage());
    }
  }
});

function removeWhiteSpaces(message: string) {
  return message.replace(/ /g, "");
}

function getSLAndTPFromLine(tpLine: string): number {
  let lineWords: any[];
  if (tpLine.includes(":")) {
    tpLine = removeWhiteSpaces(tpLine);
    lineWords = tpLine.split(":");
  } else {
    lineWords = tpLine.split(" ");
  }

  if (lineWords.length !== 2) {
    throw new BotException(
      "parser_004",
      ExceptionName.InvalidSignalFormat,
      ClientMessage.InvalidSignal
    );
  }

  if (lineWords[1].toLowerCase() === "open") {
    return -1;
  } else {
    const value = parseFloat(lineWords[1]);
    if (!value) {
      throw new BotException(
        "parser_005",
        ExceptionName.InvalidTPOrSLFormat,
        ClientMessage.InvalidTPOrSL
      );
    }
    return value;
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
    `Operation: ${operation.toUpperCase()}\n` +
    `Price: ${price}\n` +
    `TP: ${tps.map((tp) => (tp === -1 ? "Open" : tp)).join(", ")}\n` +
    `SL: ${sl === -1 ? "undefined" : sl}\n`
  );
}
function formPropMessage(): string {
  return (
    `Equity: ${equity === -1 ? "Not set" : equity}\n` +
    `Risk: ${risk === -1 ? "Not set" : risk * 100 + "%"}\n` +
    `Conversion Ratio: ${ratio === -1 ? "Not set" : ratio}\n`
  );
}

function formPositionSizingMessage(
  symbol: string,
  price: number,
  sl: number,
  tps: Array<number>
): string {
  if (equity === -1 || risk === -1) {
    return `Volume: Error - Either equity or risk is not set`;
  } else {
    let volume = getTradeVolume(symbol, price, sl);
    let possibleProfit = [];
    let result: string;
    let conversionSymbol = "USD" + symbol.slice(3).toUpperCase();
    if (volume === -1) {
      result = `Volume: Error - ${conversionSymbol} ratio is required`;
    } else {
      if (volume < 0.01) {
        possibleProfit[0] = getPossibleProfit(symbol, price, tps[0], 0.01);
        if (tps.length > 1)
          possibleProfit[1] = getPossibleProfit(symbol, price, tps[1], 0.01);

        result =
          `Volume: <0.01\n` +
          `Minimum Risk: ${(risk / volume).toFixed(2)}%\n` +
          `Max Profit: ${
            possibleProfit[0] !== -1 ? possibleProfit[0].toFixed(2) + "$" : "-"
          }\n` +
          `${
            possibleProfit[1]
              ? "Max Profit 2: " + (possibleProfit[1] !== -1)
                ? possibleProfit[1].toFixed(2) + "$"
                : "-"
              : ""
          }\n`;
      } else {
        possibleProfit[0] = getPossibleProfit(symbol, price, tps[0], volume);
        if (tps.length > 1)
          possibleProfit[1] = getPossibleProfit(symbol, price, tps[1], volume);

        result =
          `Volume: ${volume.toFixed(3)}\n` +
          `Max Profit: ${
            possibleProfit[0] !== -1 ? possibleProfit[0].toFixed(2) + "$" : "-"
          }\n` +
          `${
            possibleProfit[1]
              ? "Max Profit 2: " + (possibleProfit[1] !== -1)
                ? possibleProfit[1].toFixed(2) + "$"
                : "-"
              : ""
          }\n`;
      }
    }
    return result;
  }
}
function formSignalCorrectFormatMessage(): string {
  return (
    "[SYMBOL] [OPERATION] [PRICE]\n" +
    "tp [TAKE PROFIT]\n" +
    "sl [STOP LOSS]\n\n" +
    "========== OR ==========\n\n" +
    "[SYMBOL] [OPERATION] [PRICE]\n" +
    "tp1 [TAKE PROFIT 1]\n" +
    "tp2 [TAKE PROFIT 2]\n" +
    "sl [STOP LOSS]\n"
  );
}

function getTradeVolume(symbol: string, price: number, sl: number): number {
  let pipDiff: number = getDiffInPip(symbol, price, sl);
  //ctxObj.reply("pip diff: " + pipDiff);
  let amountAtRisk: number = equity * risk;
  let pipValue: number;
  let pipValueInSecondCurrency = getPipValuePerStandardLot(symbol);
  const conversionRatio = getConversionRatio("usd", symbol, price);

  if (conversionRatio === -1) {
    //Ratio is not set
    return -1;
  }
  pipValue = pipValueInSecondCurrency / conversionRatio;
  return amountAtRisk / (pipValue * pipDiff);
}

function getPossibleProfit(
  symbol: string,
  price: number,
  tp: number,
  volume: number
): number {
  if (tp === -1) return -1;

  const profitInPip = getDiffInPip(symbol, price, tp);
  const pipValueInSecondCurrency = getPipValuePerStandardLot(symbol);
  const conversionRatio = getConversionRatio("usd", symbol, price);
  if (conversionRatio === -1) {
    return -1;
  }
  const pipValue = pipValueInSecondCurrency * volume;

  return (profitInPip * pipValue) / conversionRatio;
}

function getDiffInPip(symbol: string, price: number, target: number): number {
  let digit: number;
  if (symbol === "gold") {
    digit = 1;
  } else if (symbol.includes("jpy")) {
    digit = 2;
  } else {
    digit = 4;
  }
  return Math.abs(price - target) * Math.pow(10, digit);
}

function getConversionRatio(
  targetCurrency: string,
  symbol: string,
  price: number
) {
  if (symbol.includes(targetCurrency)) {
    const usdIndex = symbol.indexOf(targetCurrency);
    if (usdIndex === 0) {
      return price;
    } else if (usdIndex === 3) {
      return 1;
    }
  } else if (symbol.includes("gold")) {
    return 1;
  }
  return ratio;
}

// Returns pip value per standard lot (the value is in second currency of the symbol passed)
// for example: If the symbol is EURO/JPY, pip value is 1000 Japanese yen when entered with 1 lot.
// for example: If the symbol is XAU/USD, pip value is 10 dollars when entered with 1 lot.
function getPipValuePerStandardLot(symbol: string) {
  if (symbol.includes("jpy")) {
    return 1000; //For all symbols ending with 'jpy', pip value is 1000 Japanese Yen.
  } else {
    return 10; // For all other symbols and gold, pip value is 10 unit of the second currency.
  }
}

bot.launch();
