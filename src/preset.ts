import { Decimal } from 'decimal.js'
import * as M from './math.ts'
import * as I from './indicators.ts'
import { lag, map, Stream } from './stream.ts'

export type Candle = {
	open: Decimal
	high: Decimal
	low: Decimal
	close: Decimal
	volume: Decimal
}

export type IndicatorFn<T, R, P extends number[] = number[]> = (
	...args: P
) => Stream<T, R>

const makeMapper =
	<A, B>(op: Stream<A, B>) =>
	<C, P extends number[]>(fn: IndicatorFn<B, C, P>) =>
	(...args: P) =>
		op.pipe(fn(...args))

export function initIndicators<T>(mapper: (input: T) => Candle) {
	type Indicators = typeof indicators
	type MapFn<T, F> = F extends IndicatorFn<Candle, infer R, infer P>
		? (...args: P) => Stream<T, R>
		: never
	type CustomIndicatorMap<T> = {
		[key in keyof Indicators]: MapFn<T, Indicators[key]>
	}
	const m = makeMapper(map(mapper))
	const result = {} as CustomIndicatorMap<T>
	for (const key in indicators) {
		// @ts-expect-error union keys error
		result[key] = m(indicators[key as keyof Indicators])
	}
	return result
}

const mp = makeMapper(I.closeprice)

export const indicators = {
	open: () => I.openprice,
	high: () => I.highprice,
	low: () => I.lowprice,
	close: () => I.closeprice,
	volume: () => I.volume,
	ad: () => I.ad,
	adosc: I.adosc,
	adx: I.adx,
	adx_slope: I.adx_slope,
	adxr: I.adxr,
	ao: () => I.ao,
	apo: mp(M.apo),
	aroon: I.aroon,
	aroonosc: I.aroonosc,
	atr: I.atr,
	avgprice: () => I.avgprice,
	bbands: mp(M.bbands),
	bop: () => I.bop,
	cci: I.cci,
	cmo: mp(M.cmo),
	cvi: I.cvi,
	dema: mp(M.dema),
	di: I.di,
	dm: I.dm,
	dpo: mp(M.dpo),
	dx: I.dx,
	ema: mp(M.ema),
	emv: () => I.emv,
	fisher: I.fisher,
	fosc: mp(M.fosc),
	ha_open: () => I.ha_open,
	ha_high: () => I.ha_high,
	ha_low: () => I.ha_low,
	ha_close: () => I.ha_close,
	hma: mp(M.hma),
	kama: mp(M.kama),
	kvo: I.kvo,
	linreg: mp(M.linreg),
	linregintercept: mp(M.linregintercept),
	linregslope: mp(M.linregslope),
	macd: mp(M.macd),
	marketfi: () => I.marketfi,
	mass: I.mass,
	medprice: () => I.medprice,
	md: mp(M.md),
	mfi: I.mfi,
	mom: mp(M.mom),
	msw: mp(M.msw),
	natr: I.natr,
	nvi: () => I.nvi,
	obv: () => I.obv,
	ppo: mp(M.ppo),
	psar: I.psar,
	pvi: () => I.pvi,
	qstick: I.qstick,
	roc: mp(M.roc),
	rocr: mp(M.rocr),
	rsi: mp(M.rsi),
	sma: mp(M.sma),
	stoch: I.stoch,
	stochrsi: mp(M.stochrsi),
	tema: mp(M.tema),
	tr: I.tr,
	trima: mp(M.trima),
	trix: mp(M.trix),
	tsf: mp(M.tsf),
	typprice: () => I.typprice,
	ultosc: I.ultosc,
	vhf: mp(M.vhf),
	vidya: mp(M.vidya),
	volatility: mp(M.volatility),
	vosc: I.vosc,
	vwma: I.vwma,
	wad: () => I.wad,
	wcprice: () => I.wcprice,
	wilders: mp(M.wilders),
	willr: I.willr,
	wma: mp(M.wma),
	zlema: mp(M.zlema),
}

export const operators = {
	apo: M.apo,
	bbands: M.bbands,
	cmo: M.cmo,
	crossany: () => M.crossany,
	crossover: () => M.crossover,
	decay: M.decay,
	dema: M.dema,
	dpo: M.dpo,
	edecay: M.edecay,
	ema: M.ema,
	fosc: M.fosc,
	hma: M.hma,
	kama: M.kama,
	lag,
	linreg: M.linreg,
	linregintercept: M.linregintercept,
	linregslope: M.linregslope,
	macd: M.macd,
	max: M.max,
	md: M.md,
	min: M.min,
	mom: M.mom,
	msw: M.msw,
	ppo: M.ppo,
	roc: M.roc,
	rocr: M.rocr,
	rsi: M.rsi,
	sma: M.sma,
	stddev: M.stddev,
	stderr: M.stderr,
	stochrsi: M.stochrsi,
	tema: M.tema,
	trima: M.trima,
	trix: M.trix,
	tsf: M.tsf,
	variance: M.variance,
	vhf: M.vhf,
	vidya: M.vidya,
	volatility: M.volatility,
	wilders: M.wilders,
	wma: M.wma,
	zlema: M.zlema,
}
