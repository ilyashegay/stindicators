import Decimal from 'decimal.js'

export declare type Candle = {
	open: Decimal
	high: Decimal
	low: Decimal
	close: Decimal
	volume: Decimal
}
declare type Handler<T> = (value: T) => void
export declare class Stream<P, R> {
	fn: (stream: (next: Handler<P>) => void) => (next: Handler<R>) => void
	lb: number
	constructor(
		fn: (stream: (next: Handler<P>) => void) => (next: Handler<R>) => void,
		lb?: number,
	)
	pipe<T>(op: Stream<R, T>): Stream<P, T>
	init(): (value: P) => R
}
export declare type IndicatorFn<T, R, P extends number[] = number[]> = (
	...args: P
) => Stream<T, R>
export declare type IndicatorFnRecord<T, R = IndicatorResult> = Record<
	string,
	IndicatorFn<T, R>
>
export declare type IndicatorMap<T, R extends Record<string, unknown>> = {
	[key in keyof R]: Stream<T, R[key]>
}
declare type IndicatorOption = {
	name: string
	step: number
	min: number
	max?: number
}
declare type IndicatorResult = Decimal | Decimal[]
declare type IndicatorOutput = {
	name: string
	range?: [number, number]
}
export declare enum IndicatorType {
	overlay = 'overlay',
	indicator = 'indicator',
	math = 'math',
}

export declare type IndicatorDescriptor = {
	key: string
	name: string
	type: IndicatorType
	options: IndicatorOption[]
	outputs: IndicatorOutput[]
}

export declare type DescriptorRecord = Record<string, IndicatorDescriptor>

export declare function makeOperator<P, R>(
	fn: (next: Handler<R>) => Handler<P>,
	lb?: number,
): Stream<P, R>
export declare function makeStatefulMap<P, R>(
	fn: () => (value: P) => R,
): Stream<P, R>
export declare function makeDescriptor(
	key: string,
	name: string,
	type: IndicatorType,
	options: (IndicatorOption | string)[],
	outputs: (IndicatorOutput | string)[],
): IndicatorDescriptor

export declare const decay: (period: number) => Stream<Decimal, Decimal>
export declare const edecay: (period: number) => Stream<Decimal, Decimal>
export declare const max: (period: number) => Stream<Decimal, Decimal>
export declare const min: (period: number) => Stream<Decimal, Decimal>

export declare function map<P, R>(
	callback: (value: P, index: number) => R,
): Stream<P, R>
export declare function scan<P, R>(
	callback: (accumulator: R, value: P, index: number) => R,
	initialValue: R,
): Stream<P, R>
export declare function skip<P>(count: number): Stream<P, P>
export declare function lag<T>(period: number, initialValue?: T): Stream<T, T>
export declare function mapFork<T, R extends Record<string, unknown>>(ops: {
	[key in keyof R]: Stream<T, R[key]>
}): Stream<T, R>
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

export declare const descriptors: {
	open: IndicatorDescriptor
	high: IndicatorDescriptor
	low: IndicatorDescriptor
	close: IndicatorDescriptor
	volume: IndicatorDescriptor
	ad: IndicatorDescriptor
	adosc: IndicatorDescriptor
	adx: IndicatorDescriptor
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
	hma: IndicatorDescriptor
	kama: IndicatorDescriptor
	kvo: IndicatorDescriptor
	linreg: IndicatorDescriptor
	linregintercept: IndicatorDescriptor
	linregslope: IndicatorDescriptor
	macd: IndicatorDescriptor
	marketfi: IndicatorDescriptor
	mass: IndicatorDescriptor
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

export declare const descriptorMap: DescriptorRecord

export declare function initIndicators<T>(mapper: (input: T) => Candle): {
	open: () => Stream<T, Decimal>
	high: () => Stream<T, Decimal>
	low: () => Stream<T, Decimal>
	close: () => Stream<T, Decimal>
	volume: () => Stream<T, Decimal>
	avgprice: () => Stream<T, Decimal>
	bbands: (
		period: number,
		scale: number,
	) => Stream<T, [lower: Decimal, middle: Decimal, upper: Decimal]>
	dema: (period: number) => Stream<T, Decimal>
	ema: (period: number) => Stream<T, Decimal>
	hma: (period: number) => Stream<T, Decimal>
	kama: (period: number) => Stream<T, Decimal>
	linreg: (period: number) => Stream<T, Decimal>
	medprice: () => Stream<T, Decimal>
	psar: (accel_step: number, accel_max: number) => Stream<T, Decimal>
	sma: (period: number) => Stream<T, Decimal>
	tema: (period: number) => Stream<T, Decimal>
	trima: (period: number) => Stream<T, Decimal>
	tsf: (period: number) => Stream<T, Decimal>
	typprice: () => Stream<T, Decimal>
	vidya: (short: number, long: number, factor: number) => Stream<T, Decimal>
	vwma: (period: number) => Stream<T, Decimal>
	wcprice: () => Stream<T, Decimal>
	wilders: (period: number) => Stream<T, Decimal>
	wma: (period: number) => Stream<T, Decimal>
	zlema: (period: number) => Stream<T, Decimal>
	ad: () => Stream<T, Decimal>
	adosc: (shortPeriod: number, longPeriod: number) => Stream<T, Decimal>
	adx: (period: number) => Stream<T, Decimal>
	adxr: (period: number) => Stream<T, Decimal>
	ao: () => Stream<T, Decimal>
	apo: (short: number, long: number) => Stream<T, Decimal>
	aroon: (period: number) => Stream<T, [Decimal, Decimal]>
	aroonosc: (period: number) => Stream<T, Decimal>
	atr: (period: number) => Stream<T, Decimal>
	bop: () => Stream<T, Decimal>
	cci: (period: number) => Stream<T, Decimal>
	cmo: (period: number) => Stream<T, Decimal>
	cvi: (period: number) => Stream<T, Decimal>
	di: (period: number) => Stream<T, [Decimal, Decimal]>
	dm: (period: number) => Stream<T, [Decimal, Decimal]>
	dpo: (period: number) => Stream<T, Decimal>
	dx: (period: number) => Stream<T, Decimal>
	emv: () => Stream<T, Decimal>
	fisher: (period: number) => Stream<T, [Decimal, Decimal]>
	fosc: (period: number) => Stream<T, Decimal>
	kvo: (short: number, long: number) => Stream<T, Decimal>
	linregslope: (period: number) => Stream<T, Decimal>
	linregintercept: (period: number) => Stream<T, Decimal>
	macd: (
		short: number,
		long: number,
		signal: number,
	) => Stream<T, [macd: Decimal, signal: Decimal, histogram: Decimal]>
	marketfi: () => Stream<T, Decimal>
	mass: (period: number) => Stream<T, Decimal>
	mfi: (period: number) => Stream<T, Decimal>
	mom: (period: number) => Stream<T, Decimal>
	msw: (period: number) => Stream<T, Decimal[]>
	natr: (period: number) => Stream<T, Decimal>
	nvi: () => Stream<T, Decimal>
	obv: () => Stream<T, Decimal>
	ppo: (short: number, long: number) => Stream<T, Decimal>
	pvi: () => Stream<T, Decimal>
	qstick: (period: number) => Stream<T, Decimal>
	roc: (period: number) => Stream<T, Decimal>
	rocr: (period: number) => Stream<T, Decimal>
	rsi: (period: number) => Stream<T, Decimal>
	stoch: (
		period1: number,
		period2: number,
		period3: number,
	) => Stream<T, [Decimal, Decimal]>
	stochrsi: (period: number) => Stream<T, Decimal>
	tr: () => Stream<T, Decimal>
	trix: (period: number) => Stream<T, Decimal>
	ultosc: (
		period1: number,
		period2: number,
		period3: number,
	) => Stream<T, Decimal>
	vhf: (period: number) => Stream<T, Decimal>
	volatility: (period: number) => Stream<T, Decimal>
	vosc: (fast: number, slow: number) => Stream<T, Decimal>
	wad: () => Stream<T, Decimal>
	willr: (period: number) => Stream<T, Decimal>
}

export declare const operators: {
	apo: (short: number, long: number) => Stream<Decimal, Decimal>
	bbands: (
		period: number,
		scale: number,
	) => Stream<Decimal, [lower: Decimal, middle: Decimal, upper: Decimal]>
	cmo: (period: number) => Stream<Decimal, Decimal>
	decay: (period: number) => Stream<Decimal, Decimal>
	dema: (period: number) => Stream<Decimal, Decimal>
	dpo: (period: number) => Stream<Decimal, Decimal>
	edecay: (period: number) => Stream<Decimal, Decimal>
	ema: (period: number) => Stream<Decimal, Decimal>
	fosc: (period: number) => Stream<Decimal, Decimal>
	hma: (period: number) => Stream<Decimal, Decimal>
	kama: (period: number) => Stream<Decimal, Decimal>
	linreg: (period: number) => Stream<Decimal, Decimal>
	linregintercept: (period: number) => Stream<Decimal, Decimal>
	linregslope: (period: number) => Stream<Decimal, Decimal>
	macd: (
		short: number,
		long: number,
		signal: number,
	) => Stream<Decimal, [macd: Decimal, signal: Decimal, histogram: Decimal]>
	max: (period: number) => Stream<Decimal, Decimal>
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
