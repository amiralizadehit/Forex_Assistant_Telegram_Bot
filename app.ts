import { Telegraf } from "telegraf";

const bot = new Telegraf("1601399988:AAETMLNaYjX-ubOURdvF5IOUPg0yHMHseow");

/*
bot.use((ctx, next)=>{
    ctx.reply("dd");
});
*/
//let ctxObj: any;

let equity: number = -1;
let risk: number = 0.01;
let ratio: number = -1;

bot.command("help", (ctx) => {
  ctx.reply(
    "/equity Setting your equity.\n" +
      "/risk Setting your risk%.\n" +
      "/ratio Setting conversion ratio"
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

bot.on("text", (ctx) => {
  let lines = ctx.message.text.split("\n");
  lines = lines.filter((line) => {
    return line !== "";
  });
  //ctxObj = ctx;

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
      `${formPropMessage()}` +
      `==========\n` +
      `${formPositionSizingMessage(symbol, price, sl, tps)}`
  );
  ratio = -1;
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
    `Operation: ${operation.toUpperCase()}\n` +
    `Price: ${price}\n` +
    `TP: ${tps.join(", ")}\n` +
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
      possibleProfit[0] = getPossibleProfit(symbol, price, tps[0], volume);
      if (tps.length > 1)
        possibleProfit[1] = getPossibleProfit(symbol, price, tps[1], volume);

      if (volume < 0.01) {
        result =
          `Volume: <0.01\n` +
          `Minimum Risk: ${(risk / volume).toFixed(2)}%\n` +
          `Max Profit: ${possibleProfit[0].toFixed(2)}$\n` +
          `${
            possibleProfit[1]
              ? "Max Profit 2: " + possibleProfit[1].toFixed(2) + "$"
              : ""
          }\n`;
      } else {
        possibleProfit[0] = getPossibleProfit(symbol, price, tps[0], volume);
        result =
          `Volume: ${volume.toFixed(3)}\n` +
          `Max Profit: ${possibleProfit[0].toFixed(2)}$\n` +
          `${
            possibleProfit[1]
              ? "Max Profit 2: " + possibleProfit[1].toFixed(2) + "$"
              : ""
          }\n`;
      }
    }
    return result;
  }
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
