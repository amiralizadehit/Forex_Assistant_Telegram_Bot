import {Telegraf} from 'telegraf';

const bot = new Telegraf('1601399988:AAETMLNaYjX-ubOURdvF5IOUPg0yHMHseow');

/*
bot.use((ctx, next)=>{
    ctx.reply("dd");
});
*/
//let ctxObj:any;
bot.on("text",ctx=>{
    let lines = ctx.message.text.split('\n');
    lines = lines.filter(line=>{
        return line!=="";
    })
    //ctxObj =ctx;

    //const numLines = lines.length;
    const headLineWords = lines[0].replace(/  +/g, ' ').split(' ');
    const symbol = headLineWords[0];
    const operation = headLineWords[1];
    const price = headLineWords[2];


    const tps:Array<string> = [];
    let sl:string = "undefined";

    lines.forEach((line,index)=>{
        if(index===0)return;
        if(line.toLowerCase().includes('tp')){
            tps.push(getSLAndTPFromLine(line));
        }else if(line.toLowerCase().includes('sl') || line.toLowerCase().includes('stop')){
            sl = getSLAndTPFromLine(line);
        }
    })

    ctx.reply(
`Symbol: ${symbol}
Operation: ${operation}
Price: ${price}
TP: ${tps.join(', ')}
SL: ${sl}`);

})

function removeWhiteSpaces(message:string){
    return message.replace(/ /g, '');
}

function getSLAndTPFromLine(tpLine:string):string{
    let tpLineWords: any[];
    if(tpLine.includes(":")){
        tpLine = removeWhiteSpaces(tpLine);
        tpLineWords = tpLine.split(':');
    }else{
        tpLineWords = tpLine.split(' ');
    }

    if(tpLineWords[1].toLowerCase()==="open"){
        return "-1";
    }else{
        return tpLineWords[1];
    }
}
bot.launch();