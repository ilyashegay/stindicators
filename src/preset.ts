import * as M from './math.operators'
import * as I from './indicators'
import * as T from './tulind'
import { Candle, makeMapper, makeRaw as mr, makeFromPrice as mp } from './utils'

const indicators = {
	open: mr(I.openprice),
	high: mr(I.highprice),
	low: mr(I.lowprice),
	close: mr(I.closeprice),
	volume: mr(I.volume),
	ad: mr(I.ad),
	adosc: T.adosc,
	adx: T.adx,
	adxr: T.adxr,
	ao: mr(I.ao),
	apo: mp(T.apo),
	aroon: I.aroon,
	aroonosc: I.aroonosc,
	atr: T.atr,
	avgprice: mr(I.avgprice),
	bbands: mp(M.bbands),
	bop: mr(I.bop),
	cci: I.cci,
	cmo: mp(T.cmo),
	cvi: T.cvi,
	dema: mp(T.dema),
	di: T.di,
	dm: T.dm,
	dpo: mp(T.dpo),
	dx: T.dx,
	ema: mp(T.ema),
	emv: mr(T.emv),
	fisher: I.fisher,
	fosc: mp(M.fosc),
	hma: mp(M.hma),
	kama: mp(M.kama),
	kvo: T.kvo,
	linreg: mp(M.linreg),
	linregintercept: mp(M.linregintercept),
	linregslope: mp(M.linregslope),
	macd: mp(T.macd),
	marketfi: mr(I.marketfi),
	mass: T.mass,
	medprice: mr(I.medprice),
	mfi: I.mfi,
	mom: mp(M.mom),
	msw: mp(M.msw),
	natr: T.natr,
	nvi: mr(I.nvi),
	obv: mr(I.obv),
	ppo: mp(T.ppo),
	psar: I.psar,
	pvi: mr(I.pvi),
	qstick: I.qstick,
	roc: mp(M.roc),
	rocr: mp(M.rocr),
	rsi: mp(T.rsi),
	sma: mp(M.sma),
	stoch: T.stoch,
	stochrsi: mp(T.stochrsi),
	tema: mp(T.tema),
	tr: T.tr,
	trima: mp(M.trima),
	trix: mp(T.trix),
	tsf: mp(M.tsf),
	typprice: mr(I.typprice),
	ultosc: I.ultosc,
	vhf: mp(M.vhf),
	vidya: mp(T.vidya),
	volatility: mp(T.volatility),
	vosc: I.vosc,
	vwma: I.vwma,
	wad: mr(I.wad),
	wcprice: mr(I.wcprice),
	wilders: mp(M.wilders),
	willr: I.willr,
	wma: mp(M.wma),
	zlema: mp(T.zlema),
}

export function initIndicators<T>(mapper: (input: T) => Candle) {
	const m = makeMapper(mapper)
	return {
		// Candle data
		open: m(indicators.open),
		high: m(indicators.high),
		low: m(indicators.low),
		close: m(indicators.close),
		volume: m(indicators.volume),

		// Overlays
		avgprice: m(indicators.avgprice),
		bbands: m(indicators.bbands),
		dema: m(indicators.dema),
		ema: m(indicators.ema),
		hma: m(indicators.hma),
		kama: m(indicators.kama),
		linreg: m(indicators.linreg),
		medprice: m(indicators.medprice),
		psar: m(indicators.psar),
		sma: m(indicators.sma),
		tema: m(indicators.tema),
		trima: m(indicators.trima),
		tsf: m(indicators.tsf),
		typprice: m(indicators.typprice),
		vidya: m(indicators.vidya),
		vwma: m(indicators.vwma),
		wcprice: m(indicators.wcprice),
		wilders: m(indicators.wilders),
		wma: m(indicators.wma),
		zlema: m(indicators.zlema),

		// Indicators
		ad: m(indicators.ad),
		adosc: m(indicators.adosc),
		adx: m(indicators.adx),
		adxr: m(indicators.adxr),
		ao: m(indicators.ao),
		apo: m(indicators.apo),
		aroon: m(indicators.aroon),
		aroonosc: m(indicators.aroonosc),
		atr: m(indicators.atr),
		bop: m(indicators.bop),
		cci: m(indicators.cci),
		cmo: m(indicators.cmo),
		cvi: m(indicators.cvi),
		di: m(indicators.di),
		dm: m(indicators.dm),
		dpo: m(indicators.dpo),
		dx: m(indicators.dx),
		emv: m(indicators.emv),
		fisher: m(indicators.fisher),
		fosc: m(indicators.fosc),
		kvo: m(indicators.kvo),
		linregslope: m(indicators.linregslope),
		linregintercept: m(indicators.linregintercept),
		macd: m(indicators.macd),
		marketfi: m(indicators.marketfi),
		mass: m(indicators.mass),
		mfi: m(indicators.mfi),
		mom: m(indicators.mom),
		msw: m(indicators.msw),
		natr: m(indicators.natr),
		nvi: m(indicators.nvi),
		obv: m(indicators.obv),
		ppo: m(indicators.ppo),
		pvi: m(indicators.pvi),
		qstick: m(indicators.qstick),
		roc: m(indicators.roc),
		rocr: m(indicators.rocr),
		rsi: m(indicators.rsi),
		stoch: m(indicators.stoch),
		stochrsi: m(indicators.stochrsi),
		tr: m(indicators.tr),
		trix: m(indicators.trix),
		ultosc: m(indicators.ultosc),
		vhf: m(indicators.vhf),
		volatility: m(indicators.volatility),
		vosc: m(indicators.vosc),
		wad: m(indicators.wad),
		willr: m(indicators.willr),
	}
}
