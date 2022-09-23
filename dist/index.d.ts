import Decimal from 'decimal.js'
declare type Handler<T> = (value: T) => void
export declare class Stream<P, R> {
	fn: (stream: (next: Handler<P>) => void) => (next: Handler<R>) => void
	lb: number
	constructor(
		fn: (stream: (next: Handler<P>) => void) => (next: Handler<R>) => void,
		lb?: number,
	)
	pipe<T>(op: Stream<R, T>): Stream<P, T>
	init(): (value: P) => R | undefined
}
export declare type StreamMap<T, R extends Record<string, unknown>> = {
	[key in keyof R]: Stream<T, R[key]>
}
declare class RollingList<T> {
	size: number
	private items
	length: number
	index: number
	constructor(size: number)
	push(item: T): T | undefined
	get(index?: number): T
}
export declare const identity: <T>() => Stream<T, T>
export declare const makeOperator: <P, R>(
	fn: (next: Handler<R>) => Handler<P>,
	lb?: number,
) => Stream<P, R>
export declare const makeStatefulMap: <P, R>(
	fn: () => (value: P) => R,
) => Stream<P, R>
export declare const map: <P, R>(
	callback: (value: P, index: number) => R,
) => Stream<P, R>
export declare const scan: <P, R>(
	callback: (accumulator: R, value: P, index: number) => R,
	initialValue: R,
) => Stream<P, R>
export declare const skip: <P>(count: number) => Stream<P, P>
export declare const flatMap: <T extends unknown[], R>(
	mapper: (...args: T) => R,
) => Stream<T, R>
export declare const mapWithLast: <T, R>(
	mapper: (value: T, prev: T) => R,
	firstResult?: R | undefined,
) => Stream<T, R>
export declare const lag: <T>(
	period: number,
	initialValue?: T | undefined,
) => Stream<T, T>
export declare const forkWithLag: <T>(
	period: number,
	initialValue?: T | undefined,
) => Stream<T, [T, T]>
export declare const memAll: <T>(
	period: number,
	skip?: boolean,
) => Stream<T, RollingList<T>>
export declare type Matcher<T> = (current: T, next: T) => boolean
export declare const matchItem: <T>(
	period: number,
	matcher: Matcher<T>,
) => Stream<T, T>
export declare const matchDistance: <T>(
	period: number,
	matcher: Matcher<T>,
) => Stream<T, number>
export declare function mapFork<T, R extends Record<string, unknown>>(
	ops: StreamMap<T, R>,
): Stream<T, R>
export declare function listFork<T, R>(
	ops: readonly Stream<T, R>[],
): Stream<T, R[]>
export declare function fastListFork<T, R>(
	ops: readonly Stream<T, R>[],
): Stream<T, R[]>
export declare function fork<T, T1, T2>(
	op1: Stream<T, T1>,
	op2: Stream<T, T2>,
): Stream<T, [T1, T2]>
export declare function fork<T, T1, T2, T3>(
	op1: Stream<T, T1>,
	op2: Stream<T, T2>,
	op3: Stream<T, T3>,
): Stream<T, [T1, T2, T3]>
export declare function fork<T, T1, T2, T3, T4>(
	op1: Stream<T, T1>,
	op2: Stream<T, T2>,
	op3: Stream<T, T3>,
	op4: Stream<T, T4>,
): Stream<T, [T1, T2, T3, T4]>
export declare function fork<T, T1, T2, T3, T4, T5>(
	op1: Stream<T, T1>,
	op2: Stream<T, T2>,
	op3: Stream<T, T3>,
	op4: Stream<T, T4>,
	op5: Stream<T, T5>,
): Stream<T, [T1, T2, T3, T4, T5]>
export declare function fastFork<T, T1, T2>(
	op1: Stream<T, T1>,
	op2: Stream<T, T2>,
): Stream<T, [T1, T2]>
export declare function fastFork<T, T1, T2, T3>(
	op1: Stream<T, T1>,
	op2: Stream<T, T2>,
	op3: Stream<T, T3>,
): Stream<T, [T1, T2, T3]>
export declare function fastFork<T, T1, T2, T3, T4>(
	op1: Stream<T, T1>,
	op2: Stream<T, T2>,
	op3: Stream<T, T3>,
	op4: Stream<T, T4>,
): Stream<T, [T1, T2, T3, T4]>
export declare function fastFork<T, T1, T2, T3, T4, T5>(
	op1: Stream<T, T1>,
	op2: Stream<T, T2>,
	op3: Stream<T, T3>,
	op4: Stream<T, T4>,
	op5: Stream<T, T5>,
): Stream<T, [T1, T2, T3, T4, T5]>
export declare function pipe<T, A, B>(
	op1: Stream<T, A>,
	op2: Stream<A, B>,
): Stream<T, B>
export declare function pipe<T, A, B, C>(
	op1: Stream<T, A>,
	op2: Stream<A, B>,
	op3: Stream<B, C>,
): Stream<T, C>
export declare function pipe<T, A, B, C, D>(
	op1: Stream<T, A>,
	op2: Stream<A, B>,
	op3: Stream<B, C>,
	op4: Stream<C, D>,
): Stream<T, D>
export declare function pipe<T, A, B, C, D, E>(
	op1: Stream<T, A>,
	op2: Stream<A, B>,
	op3: Stream<B, C>,
	op4: Stream<C, D>,
	op5: Stream<D, E>,
): Stream<T, E>
export declare function pipe<T, A, B, C, D, E, F>(
	op1: Stream<T, A>,
	op2: Stream<A, B>,
	op3: Stream<B, C>,
	op4: Stream<C, D>,
	op5: Stream<D, E>,
	op6: Stream<E, F>,
): Stream<T, F>
export declare function pipe<T, A, B, C, D, E, F, G>(
	op1: Stream<T, A>,
	op2: Stream<A, B>,
	op3: Stream<B, C>,
	op4: Stream<C, D>,
	op5: Stream<D, E>,
	op6: Stream<E, F>,
	op7: Stream<F, G>,
): Stream<T, G>
export declare function pipe<T, A, B, C, D, E, F, G, H>(
	op1: Stream<T, A>,
	op2: Stream<A, B>,
	op3: Stream<B, C>,
	op4: Stream<C, D>,
	op5: Stream<D, E>,
	op6: Stream<E, F>,
	op7: Stream<F, G>,
	op8: Stream<G, H>,
): Stream<T, H>
export declare function pipe<T, A, B, C, D, E, F, G, H, I>(
	op1: Stream<T, A>,
	op2: Stream<A, B>,
	op3: Stream<B, C>,
	op4: Stream<C, D>,
	op5: Stream<D, E>,
	op6: Stream<E, F>,
	op7: Stream<F, G>,
	op8: Stream<G, H>,
	op9: Stream<H, I>,
): Stream<T, I>
export declare function pipe<T, A, B, C, D, E, F, G, H, I>(
	op1: Stream<T, A>,
	op2: Stream<A, B>,
	op3: Stream<B, C>,
	op4: Stream<C, D>,
	op5: Stream<D, E>,
	op6: Stream<E, F>,
	op7: Stream<F, G>,
	op8: Stream<G, H>,
	op9: Stream<H, I>,
): Stream<T, I>
export declare type Candle = {
	open: Decimal
	high: Decimal
	low: Decimal
	close: Decimal
	volume: Decimal
}
export declare type IndicatorFn<T, R, P extends number[] = number[]> = (
	...args: P
) => Stream<T, R>
export declare function initIndicators<T>(mapper: (input: T) => Candle): {
	open: () => Stream<T, Decimal>
	high: () => Stream<T, Decimal>
	low: () => Stream<T, Decimal>
	close: () => Stream<T, Decimal>
	volume: () => Stream<T, Decimal>
	ad: () => Stream<T, Decimal>
	adosc: (shortPeriod: number, longPeriod: number) => Stream<T, Decimal>
	adx: (period: number) => Stream<T, Decimal>
	adx_slope: (adx_period: number, slope_period: number) => Stream<T, Decimal>
	adxr: (period: number) => Stream<T, Decimal>
	ao: () => Stream<T, Decimal>
	apo: (short: number, long: number) => Stream<T, Decimal>
	aroon: (period: number) => Stream<T, [Decimal, Decimal]>
	aroonosc: (period: number) => Stream<T, Decimal>
	atr: (period: number) => Stream<T, Decimal>
	avgprice: () => Stream<T, Decimal>
	bbands: (
		period: number,
		scale: number,
	) => Stream<T, [lower: Decimal, middle: Decimal, upper: Decimal]>
	bop: () => Stream<T, Decimal>
	cci: (period: number) => Stream<T, Decimal>
	cmo: (period: number) => Stream<T, Decimal>
	cvi: (period: number) => Stream<T, Decimal>
	dema: (period: number) => Stream<T, Decimal>
	di: (period: number) => Stream<T, [Decimal, Decimal]>
	dm: (period: number) => Stream<T, [Decimal, Decimal]>
	dpo: (period: number) => Stream<T, Decimal>
	dx: (period: number) => Stream<T, Decimal>
	ema: (period: number) => Stream<T, Decimal>
	emv: () => Stream<T, Decimal>
	fisher: (period: number) => Stream<T, [Decimal, Decimal]>
	fosc: (period: number) => Stream<T, Decimal>
	ha_open: () => Stream<T, Decimal>
	ha_high: () => Stream<T, Decimal>
	ha_low: () => Stream<T, Decimal>
	ha_close: () => Stream<T, Decimal>
	hma: (period: number) => Stream<T, Decimal>
	kama: (period: number) => Stream<T, Decimal>
	kvo: (short: number, long: number) => Stream<T, Decimal>
	linreg: (period: number) => Stream<T, Decimal>
	linregintercept: (period: number) => Stream<T, Decimal>
	linregslope: (period: number) => Stream<T, Decimal>
	macd: (
		short: number,
		long: number,
		signal: number,
	) => Stream<T, [macd: Decimal, signal: Decimal, histogram: Decimal]>
	marketfi: () => Stream<T, Decimal>
	mass: (period: number) => Stream<T, Decimal>
	medprice: () => Stream<T, Decimal>
	md: (period: number) => Stream<T, Decimal>
	mfi: (period: number) => Stream<T, Decimal>
	mom: (period: number) => Stream<T, Decimal>
	msw: (period: number) => Stream<T, Decimal[]>
	natr: (period: number) => Stream<T, Decimal>
	nvi: () => Stream<T, Decimal>
	obv: () => Stream<T, Decimal>
	ppo: (short: number, long: number) => Stream<T, Decimal>
	psar: (accel_step: number, accel_max: number) => Stream<T, Decimal>
	pvi: () => Stream<T, Decimal>
	qstick: (period: number) => Stream<T, Decimal>
	roc: (period: number) => Stream<T, Decimal>
	rocr: (period: number) => Stream<T, Decimal>
	rsi: (period: number) => Stream<T, Decimal>
	sma: (period: number) => Stream<T, Decimal>
	stoch: (
		period1: number,
		period2: number,
		period3: number,
	) => Stream<T, [Decimal, Decimal]>
	stochrsi: (period: number) => Stream<T, Decimal>
	tema: (period: number) => Stream<T, Decimal>
	tr: () => Stream<T, Decimal>
	trima: (period: number) => Stream<T, Decimal>
	trix: (period: number) => Stream<T, Decimal>
	tsf: (period: number) => Stream<T, Decimal>
	typprice: () => Stream<T, Decimal>
	ultosc: (
		period1: number,
		period2: number,
		period3: number,
	) => Stream<T, Decimal>
	vhf: (period: number) => Stream<T, Decimal>
	vidya: (short: number, long: number, factor: number) => Stream<T, Decimal>
	volatility: (period: number) => Stream<T, Decimal>
	vosc: (fast: number, slow: number) => Stream<T, Decimal>
	vwma: (period: number) => Stream<T, Decimal>
	wad: () => Stream<T, Decimal>
	wcprice: () => Stream<T, Decimal>
	wilders: (period: number) => Stream<T, Decimal>
	willr: (period: number) => Stream<T, Decimal>
	wma: (period: number) => Stream<T, Decimal>
	zlema: (period: number) => Stream<T, Decimal>
}
export declare const indicators: {
	open: () => Stream<Candle, Decimal>
	high: () => Stream<Candle, Decimal>
	low: () => Stream<Candle, Decimal>
	close: () => Stream<Candle, Decimal>
	volume: () => Stream<Candle, Decimal>
	ad: () => Stream<Candle, Decimal>
	adosc: (shortPeriod: number, longPeriod: number) => Stream<Candle, Decimal>
	adx: (period: number) => Stream<Candle, Decimal>
	adx_slope: (
		adx_period: number,
		slope_period: number,
	) => Stream<Candle, Decimal>
	adxr: (period: number) => Stream<Candle, Decimal>
	ao: () => Stream<Candle, Decimal>
	apo: (short: number, long: number) => Stream<Candle, Decimal>
	aroon: (period: number) => Stream<Candle, [Decimal, Decimal]>
	aroonosc: (period: number) => Stream<Candle, Decimal>
	atr: (period: number) => Stream<Candle, Decimal>
	avgprice: () => Stream<Candle, Decimal>
	bbands: (
		period: number,
		scale: number,
	) => Stream<Candle, [lower: Decimal, middle: Decimal, upper: Decimal]>
	bop: () => Stream<Candle, Decimal>
	cci: (period: number) => Stream<Candle, Decimal>
	cmo: (period: number) => Stream<Candle, Decimal>
	cvi: (period: number) => Stream<Candle, Decimal>
	dema: (period: number) => Stream<Candle, Decimal>
	di: (period: number) => Stream<Candle, [Decimal, Decimal]>
	dm: (period: number) => Stream<Candle, [Decimal, Decimal]>
	dpo: (period: number) => Stream<Candle, Decimal>
	dx: (period: number) => Stream<Candle, Decimal>
	ema: (period: number) => Stream<Candle, Decimal>
	emv: () => Stream<Candle, Decimal>
	fisher: (period: number) => Stream<Candle, [Decimal, Decimal]>
	fosc: (period: number) => Stream<Candle, Decimal>
	ha_open: () => Stream<Candle, Decimal>
	ha_high: () => Stream<Candle, Decimal>
	ha_low: () => Stream<Candle, Decimal>
	ha_close: () => Stream<Candle, Decimal>
	hma: (period: number) => Stream<Candle, Decimal>
	kama: (period: number) => Stream<Candle, Decimal>
	kvo: (short: number, long: number) => Stream<Candle, Decimal>
	linreg: (period: number) => Stream<Candle, Decimal>
	linregintercept: (period: number) => Stream<Candle, Decimal>
	linregslope: (period: number) => Stream<Candle, Decimal>
	macd: (
		short: number,
		long: number,
		signal: number,
	) => Stream<Candle, [macd: Decimal, signal: Decimal, histogram: Decimal]>
	marketfi: () => Stream<Candle, Decimal>
	mass: (period: number) => Stream<Candle, Decimal>
	medprice: () => Stream<Candle, Decimal>
	md: (period: number) => Stream<Candle, Decimal>
	mfi: (period: number) => Stream<Candle, Decimal>
	mom: (period: number) => Stream<Candle, Decimal>
	msw: (period: number) => Stream<Candle, Decimal[]>
	natr: (period: number) => Stream<Candle, Decimal>
	nvi: () => Stream<Candle, Decimal>
	obv: () => Stream<Candle, Decimal>
	ppo: (short: number, long: number) => Stream<Candle, Decimal>
	psar: (accel_step: number, accel_max: number) => Stream<Candle, Decimal>
	pvi: () => Stream<Candle, Decimal>
	qstick: (period: number) => Stream<Candle, Decimal>
	roc: (period: number) => Stream<Candle, Decimal>
	rocr: (period: number) => Stream<Candle, Decimal>
	rsi: (period: number) => Stream<Candle, Decimal>
	sma: (period: number) => Stream<Candle, Decimal>
	stoch: (
		period1: number,
		period2: number,
		period3: number,
	) => Stream<Candle, [Decimal, Decimal]>
	stochrsi: (period: number) => Stream<Candle, Decimal>
	tema: (period: number) => Stream<Candle, Decimal>
	tr: () => Stream<Candle, Decimal>
	trima: (period: number) => Stream<Candle, Decimal>
	trix: (period: number) => Stream<Candle, Decimal>
	tsf: (period: number) => Stream<Candle, Decimal>
	typprice: () => Stream<Candle, Decimal>
	ultosc: (
		period1: number,
		period2: number,
		period3: number,
	) => Stream<Candle, Decimal>
	vhf: (period: number) => Stream<Candle, Decimal>
	vidya: (
		short: number,
		long: number,
		factor: number,
	) => Stream<Candle, Decimal>
	volatility: (period: number) => Stream<Candle, Decimal>
	vosc: (fast: number, slow: number) => Stream<Candle, Decimal>
	vwma: (period: number) => Stream<Candle, Decimal>
	wad: () => Stream<Candle, Decimal>
	wcprice: () => Stream<Candle, Decimal>
	wilders: (period: number) => Stream<Candle, Decimal>
	willr: (period: number) => Stream<Candle, Decimal>
	wma: (period: number) => Stream<Candle, Decimal>
	zlema: (period: number) => Stream<Candle, Decimal>
}
export declare const operators: {
	apo: (short: number, long: number) => Stream<Decimal, Decimal>
	bbands: (
		period: number,
		scale: number,
	) => Stream<Decimal, [lower: Decimal, middle: Decimal, upper: Decimal]>
	cmo: (period: number) => Stream<Decimal, Decimal>
	crossany: () => Stream<[Decimal, Decimal], 0 | 1>
	crossover: () => Stream<[Decimal, Decimal], 0 | 1>
	decay: (period: number) => Stream<Decimal, Decimal>
	dema: (period: number) => Stream<Decimal, Decimal>
	dpo: (period: number) => Stream<Decimal, Decimal>
	edecay: (period: number) => Stream<Decimal, Decimal>
	ema: (period: number) => Stream<Decimal, Decimal>
	fosc: (period: number) => Stream<Decimal, Decimal>
	hma: (period: number) => Stream<Decimal, Decimal>
	kama: (period: number) => Stream<Decimal, Decimal>
	lag: <T>(period: number, initialValue?: T | undefined) => Stream<T, T>
	linreg: (period: number) => Stream<Decimal, Decimal>
	linregintercept: (period: number) => Stream<Decimal, Decimal>
	linregslope: (period: number) => Stream<Decimal, Decimal>
	macd: (
		short: number,
		long: number,
		signal: number,
	) => Stream<Decimal, [macd: Decimal, signal: Decimal, histogram: Decimal]>
	max: (period: number) => Stream<Decimal, Decimal>
	md: (period: number) => Stream<Decimal, Decimal>
	min: (period: number) => Stream<Decimal, Decimal>
	mom: (period: number) => Stream<Decimal, Decimal>
	msw: (period: number) => Stream<Decimal, Decimal[]>
	ppo: (short: number, long: number) => Stream<Decimal, Decimal>
	roc: (period: number) => Stream<Decimal, Decimal>
	rocr: (period: number) => Stream<Decimal, Decimal>
	rsi: (period: number) => Stream<Decimal, Decimal>
	sma: (period: number) => Stream<Decimal, Decimal>
	stddev: (period: number) => Stream<Decimal, Decimal>
	stderr: (period: number) => Stream<Decimal, Decimal>
	stochrsi: (period: number) => Stream<Decimal, Decimal>
	tema: (period: number) => Stream<Decimal, Decimal>
	trima: (period: number) => Stream<Decimal, Decimal>
	trix: (period: number) => Stream<Decimal, Decimal>
	tsf: (period: number) => Stream<Decimal, Decimal>
	variance: (period: number) => Stream<Decimal, Decimal>
	vhf: (period: number) => Stream<Decimal, Decimal>
	vidya: (
		short: number,
		long: number,
		factor: number,
	) => Stream<Decimal, Decimal>
	volatility: (period: number) => Stream<Decimal, Decimal>
	wilders: (period: number) => Stream<Decimal, Decimal>
	wma: (period: number) => Stream<Decimal, Decimal>
	zlema: (period: number) => Stream<Decimal, Decimal>
}
export declare enum IndicatorType {
	overlay = 'overlay',
	indicator = 'indicator',
}
export declare type IndicatorOption = {
	name: string
	step: number
	min: number
	max?: number
}
export declare type IndicatorOutput = {
	name: string
	range?: [number, number]
}
export declare type IndicatorDescriptor = {
	key: string
	name: string
	type: IndicatorType
	options: IndicatorOption[]
	outputs: IndicatorOutput[]
}
export declare const makeDescriptor: (
	key: string,
	name: string,
	type: IndicatorType,
	options: (IndicatorOption | string)[],
	outputs: (IndicatorOutput | string)[],
) => IndicatorDescriptor
export declare const descriptors: {
	open: IndicatorDescriptor
	high: IndicatorDescriptor
	low: IndicatorDescriptor
	close: IndicatorDescriptor
	volume: IndicatorDescriptor
	ad: IndicatorDescriptor
	adosc: IndicatorDescriptor
	adx: IndicatorDescriptor
	adx_slope: IndicatorDescriptor
	adxr: IndicatorDescriptor
	ao: IndicatorDescriptor
	apo: IndicatorDescriptor
	aroon: IndicatorDescriptor
	aroonosc: IndicatorDescriptor
	atr: IndicatorDescriptor
	avgprice: IndicatorDescriptor
	bbands: IndicatorDescriptor
	bop: IndicatorDescriptor
	cci: IndicatorDescriptor
	cmo: IndicatorDescriptor
	cvi: IndicatorDescriptor
	dema: IndicatorDescriptor
	di: IndicatorDescriptor
	dm: IndicatorDescriptor
	dpo: IndicatorDescriptor
	dx: IndicatorDescriptor
	ema: IndicatorDescriptor
	emv: IndicatorDescriptor
	fisher: IndicatorDescriptor
	fosc: IndicatorDescriptor
	ha_open: IndicatorDescriptor
	ha_high: IndicatorDescriptor
	ha_low: IndicatorDescriptor
	ha_close: IndicatorDescriptor
	hma: IndicatorDescriptor
	kama: IndicatorDescriptor
	kvo: IndicatorDescriptor
	linreg: IndicatorDescriptor
	linregintercept: IndicatorDescriptor
	linregslope: IndicatorDescriptor
	macd: IndicatorDescriptor
	marketfi: IndicatorDescriptor
	mass: IndicatorDescriptor
	md: IndicatorDescriptor
	medprice: IndicatorDescriptor
	mfi: IndicatorDescriptor
	mom: IndicatorDescriptor
	msw: IndicatorDescriptor
	natr: IndicatorDescriptor
	nvi: IndicatorDescriptor
	obv: IndicatorDescriptor
	ppo: IndicatorDescriptor
	psar: IndicatorDescriptor
	pvi: IndicatorDescriptor
	qstick: IndicatorDescriptor
	roc: IndicatorDescriptor
	rocr: IndicatorDescriptor
	rsi: IndicatorDescriptor
	sma: IndicatorDescriptor
	stoch: IndicatorDescriptor
	stochrsi: IndicatorDescriptor
	tema: IndicatorDescriptor
	tr: IndicatorDescriptor
	trima: IndicatorDescriptor
	trix: IndicatorDescriptor
	tsf: IndicatorDescriptor
	typprice: IndicatorDescriptor
	ultosc: IndicatorDescriptor
	vhf: IndicatorDescriptor
	vidya: IndicatorDescriptor
	volatility: IndicatorDescriptor
	vosc: IndicatorDescriptor
	vwma: IndicatorDescriptor
	wad: IndicatorDescriptor
	wcprice: IndicatorDescriptor
	wilders: IndicatorDescriptor
	willr: IndicatorDescriptor
	wma: IndicatorDescriptor
	zlema: IndicatorDescriptor
}
