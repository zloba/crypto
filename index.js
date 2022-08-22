const ccxt = require ('ccxt')
const fs = require('fs')
const fsp = require('fs/promises')

const logger = require('./logger');
// console.dir(ccxt.exchanges, {'maxArrayLength': null}); return;

if (!fs.existsSync('./result')){
    fs.mkdirSync('./result');
}

async function main () {
    const exchangeNames = [
        'binance', 
        'coinbasepro',
        'whitebit', 
        'okx', 
        'ftx',
        'kucoin',
        // 'kraken',
        'exmo',
        'gateio',
        'huobi',
        'bitget',
        'kuna',
        'poloniex',
    ];
    
    let resultTickers = [];
    
    result = await Promise.all(exchangeNames.map(async (exchangeName) => {
        const startTime = Date.now();
        let params = {};
        switch (exchangeName) {
            case 'okx' : params = {rateLimit: 110}; break;
            case 'kucoin' : params = {rateLimit: 500}; break;
            case 'huobi' : params = {rateLimit: 200}; break;
            case 'bitget' : params = {rateLimit: 100}; break;
        }
        const exchange = new ccxt[exchangeName](params);
        exchange.throttle.config["maxCapacity"] = 100000;   //Увеличиваем лимит запросов
        exchange.timeout = 60000;

        const tickers = await exchange.fetchTickers()   //запрашиваем пары
        .catch(e => {logger.error(e.message)}); 
        
        if (!tickers)
            return;

        let OHLCVPromises = [];
        for (let ticker in tickers) {   //Массив промисов для асинхронных запросов
            switch (exchangeName) {     //Пропускаем замороженные
                case 'whitebit':  if (tickers[ticker].info.isFrozen) { continue; }       
            }
            OHLCVPromises.push(exchange.fetchOHLCV(ticker, '1d',undefined,1).catch(e => { logger.error(`${ticker} ${e.message}`) }));
        }
        
        let undef = 0;
        OHLCV = await Promise.all(OHLCVPromises).catch(e => { logger.error(`${ticker} ${e.message}`) }); //Выполняем параллельно запросы 
        OHLCV.forEach(element => {    //Считаем не полученные
            if (!element)
                undef++;     
        });
        
        resultTickers[exchangeName] = {};
        let index = 0;
        for (let ticker in tickers) {   //Формируем результирующий массив
            let average = 0;
            if (!OHLCV[index])  //Пропускаем если нет данных
                continue;

            switch (exchange.id) {  //Считаем среднюю стоимость
                case "kuna": average = (tickers[ticker]['high']+tickers[ticker]['low'])/2; break;
                case "coinbasepro": average = (tickers[ticker]['info'][1]+tickers[ticker]['info'][2])/2; break;
                case "ftx": average = +tickers[ticker]['info']['price']; break;
                default:  average = +tickers[ticker].vwap; break;
            }
            resultTickers[exchangeName][ticker] = [];      
            resultTickers[exchangeName][ticker].push({    //формируем результирующий массив
                average: average,
                count: (OHLCV[index].length)?OHLCV[index][0][5]:0   //если есть OHLCV
            })
            index++;
        }
        const endTime = Date.now() - startTime;
        await fsp.writeFile(`./result/${exchange.id}.json`, JSON.stringify(resultTickers[exchangeName]));
        logger.info(`${exchange.id} ${OHLCV.length} of ${OHLCVPromises.length} (${Object.keys(tickers).length}) tasks in ${endTime} ms, undefined ${undef}`);
    })); 
}

main ();