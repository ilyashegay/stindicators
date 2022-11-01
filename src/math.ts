import { Decimal } from 'decimal.js'
import {
	fastFork,
	flatMap,
	fork,
	forkWithLag,
	identity,
	lag,
	map,
	mapWithLast,
	matchDistance,
	matchItem,
	memAll,
	pipe,
	scan,
	skip,
	Stream,
} from './stream.ts'

export const ZERO = new Decimal(0)
export const ONE = new Decimal(1)
export const HUNDRED = new Decimal(100)

export type Smoother = Stream<Decimal, Decimal>

export const factors = {
	d: (period: number): number => (period - 1) / period,
	e: (period: number): number => 2 / (period + 1),
}

const wrapBinaryOperator =
	(op: Stream<[Decimal, Decimal], Decimal>) =>
	<T>(short: Stream<T, Decimal>, long: Stream<T, Decimal>) =>
		pipe(fork(short, long), op)

export const oscillate = {
	diff_over_long: flatMap((short: Decimal, long: Decimal) =>
		short.minus(long).div(long).times(HUNDRED),
	),
	diff_over_short: flatMap((short: Decimal, long: Decimal) =>
		short.minus(long).div(short).times(HUNDRED),
	),
	short_over_sum: flatMap((short: Decimal, long: Decimal) =>
		short.div(short.plus(long)).times(HUNDRED),
	),
	diff_over_sum: flatMap((short: Decimal, long: Decimal) =>
		short.minus(long).div(short.plus(long)).times(HUNDRED),
	),
}

export const oscillators = {
	diff_over_long: wrapBinaryOperator(oscillate.diff_over_long),
	diff_over_short: wrapBinaryOperator(oscillate.diff_over_short),
	short_over_sum: wrapBinaryOperator(oscillate.short_over_sum),
	diff_over_sum: wrapBinaryOperator(oscillate.diff_over_sum),
}

export const minus = wrapBinaryOperator(flatMap((a, b) => a.minus(b)))

export const div = <T>(
	short: Stream<T, Decimal>,
	long: Stream<T, Decimal>,
	multiplier = ONE,
) =>
	pipe(
		fork(short, long),
		flatMap((a, b) => a.div(b).times(multiplier)),
	)

export const stoch = <T>(
	close: Stream<T, Decimal>,
	short: Stream<T, Decimal>,
	long: Stream<T, Decimal>,
	multiplier: number | Decimal = ONE,
) =>
	pipe(
		fork(close, short, long),
		flatMap((close, short, long) =>
			close.minus(long).div(short.minus(long)).times(multiplier),
		),
	)

export const multiplyBy = (factor: number | Decimal) =>
	map((n: Decimal) => n.times(factor))

export const divideBy = (divider: number | Decimal) =>
	map((n: Decimal) => n.div(divider))

export const index = scan((count) => count + 1, -1)

export const sum = (period: number) =>
	pipe(
		forkWithLag(period, ZERO),
		scan((sum, [head, tail]) => sum.plus(head).minus(tail), ZERO),
		skip(period - 1),
	)

const weighted_sum = (period: number) =>
	pipe(
		fork(
			map((value: Decimal, index) => value.times(Math.min(period, index + 1))),
			pipe(
				forkWithLag(period, ZERO),
				scan((sum, [head, tail]) => sum.plus(head).minus(tail), ZERO),
				lag(1, ZERO),
				map((sum, index) => (index < period ? ZERO : sum)),
			),
		),
		scan((wsum, [wvalue, sum]) => wsum.plus(wvalue).minus(sum), ZERO),
		skip(period - 1),
	)

export const crossany = mapWithLast<[Decimal, Decimal], 1 | 0>(
	([a, b], [last_a, last_b]) =>
		(a.gt(b) && last_a.lte(last_b)) || (a.lt(b) && last_a.gte(last_b)) ? 1 : 0,
)

export const crossover = mapWithLast<[Decimal, Decimal], 1 | 0>(
	([a, b], [last_a, last_b]) => (a.gt(b) && last_a.lte(last_b) ? 1 : 0),
)

export const decay = (period: number) =>
	scan<Decimal, Decimal>(
		(decay, value) => Decimal.max(value, decay.minus(1 / period), ZERO),
		ZERO,
	)

export const edecay = (period: number) =>
	scan<Decimal, Decimal>(
		(decay, value) =>
			Decimal.max(value, decay.times(period - 1).div(period), ZERO),
		ZERO,
	)

export const max = (period: number) =>
	matchItem(period, (current, next: Decimal) => next.gte(current))
export const min = (period: number) =>
	matchItem(period, (current, next: Decimal) => next.lte(current))
export const max_distance = (period: number) =>
	matchDistance(period, (current, next: Decimal) => next.gte(current))
export const min_distance = (period: number) =>
	matchDistance(period, (current, next: Decimal) => next.lte(current))

export const custom_ema = (factor: number) =>
	scan(
		(ema, val: Decimal, index) =>
			index === 0 ? val : val.times(factor).plus(ema.times(1 - factor)),
		ZERO,
	)

export const ema = (period: number) => custom_ema(factors.e(period))

export const double_ema = (period: number, factor: number) =>
	pipe(
		custom_ema(factor),
		skip(period - 1),
		custom_ema(factor),
		skip(period - 1),
	)

export const triple_ema = (period: number, factor: number) =>
	pipe(
		custom_ema(factor),
		skip(period - 1),
		custom_ema(factor),
		skip(period - 1),
		custom_ema(factor),
		skip(period - 1),
	)

export const custom_dema = (period: number, factor: number) =>
	pipe(
		fork(custom_ema(factor), double_ema(period, factor)),
		flatMap((ema1, ema2) => ema1.times(2).minus(ema2)),
	)

export const dema = (period: number) => custom_dema(period, factors.e(period))

export const custom_tema = (period: number, factor: number) =>
	pipe(
		fork(
			custom_ema(factor),
			double_ema(period, factor),
			triple_ema(period, factor),
		),
		flatMap((ema1, ema2, ema3) =>
			ema1.times(3).minus(ema2.times(3)).plus(ema3),
		),
	)

export const tema = (period: number) => custom_tema(period, factors.e(period))

export const custom_trix = (period: number, factor: number) =>
	pipe(triple_ema(period, factor), forkWithLag(1), oscillate.diff_over_short)

export const trix = (period: number) => custom_trix(period, factors.e(period))

export const custom_dm_smoother = (period: number, factor: number) =>
	pipe(
		scan(
			(val, input: Decimal, index) =>
				index < period ? val.plus(input) : val.times(factor).plus(input),
			ZERO,
		),
		skip(period - 1),
	)

export const sma = (period: number) => pipe(sum(period), divideBy(period))

export const wilders = (period: number) =>
	pipe(
		scan((wilders, input: Decimal, index) => {
			if (index < period) {
				wilders = wilders.plus(input)
			}
			if (index === period - 1) {
				wilders = wilders.div(period)
			}
			if (index > period - 1) {
				wilders = input.minus(wilders).div(period).plus(wilders)
			}
			return wilders
		}, ZERO),
		skip(period - 1),
	)

export const wma = (period: number) =>
	pipe(weighted_sum(period), divideBy((period * (period + 1)) / 2))

export const hma = (period: number) =>
	pipe(
		fork(wma(Math.floor(period / 2)), wma(period)),
		flatMap((wma1, wma2) => wma1.times(2).minus(wma2)),
		wma(Math.floor(Math.sqrt(period))),
	)

export const custom_zlema = (factor: number, lag: number) =>
	pipe(
		forkWithLag(lag, ZERO),
		skip(lag - 1),
		map(([head, tail], index) =>
			index === 0 ? head : head.plus(head.minus(tail)),
		),
		custom_ema(factor),
	)

export const zlema = (period: number) =>
	custom_zlema(factors.e(period), Math.floor((period - 1) / 2))

export const kama = (period: number) => {
	const f = new Decimal(2).div(3)
	const s = new Decimal(2).div(31)
	const fs = f.minus(s)
	return pipe(
		fork(
			pipe(
				div(
					pipe(
						forkWithLag(period, ZERO),
						flatMap((head, tail) => head.minus(tail).abs()),
					),
					pipe(
						mapWithLast((head, tail) => head.minus(tail).abs(), ZERO),
						sum(period),
					),
				),
				map((e) => e.times(fs).plus(s).pow(2)),
			),
			identity(),
		),
		scan(
			(kama, [s, val], index) =>
				index > 0 ? val.minus(kama).times(s).plus(kama) : val,
			ZERO,
		),
	)
}

export const trima = (period: number) =>
	pipe(
		fork(
			identity<Decimal>(),
			pipe(
				forkWithLag(Math.floor(period / 2), ZERO),
				scan((sum, [head, tail]) => sum.plus(head).minus(tail), ZERO),
				lag(1, ZERO),
				map((sum, index) => (index < Math.floor(period / 2) + 1 ? ZERO : sum)),
			),
			pipe(
				forkWithLag(Math.ceil(period / 2), ZERO),
				scan((sum, [head, tail]) => sum.plus(head).minus(tail), ZERO),
				lag(Math.floor(period / 2) + 1, ZERO),
				map((sum, index) => (index < period ? ZERO : sum)),
			),
		),
		map(([value, lsum, tsum]) => value.plus(lsum).minus(tsum)),
		scan((wsum, delta) => wsum.plus(delta), ZERO),
		skip(period - 1),
		divideBy(
			period % 2
				? (Math.floor(period / 2) + 1) * (Math.floor(period / 2) + 1)
				: (Math.floor(period / 2) + 1) * Math.floor(period / 2),
		),
	)

export const md = (period: number) =>
	pipe(
		fork(sma(period), memAll<Decimal>(period, true)),
		flatMap((sma, inputs) => {
			let sum = ZERO
			for (let i = 0; i < period; i++) {
				sum = sum.plus(inputs.get(i).minus(sma).abs())
			}
			return sum.div(period)
		}),
	)

export const custom_variance = (smoother: Smoother) =>
	pipe(
		fork(
			pipe(
				map((n: Decimal) => n.pow(2)),
				smoother,
			),
			pipe(
				smoother,
				map((n) => n.pow(2)),
			),
		),
		flatMap((p2, p1) => p2.minus(p1)),
	)

export const custom_stddev = (smoother: Smoother) =>
	pipe(
		custom_variance(smoother),
		map((n) => n.sqrt()),
	)

export const custom_stderr = (period: number, smoother: Smoother) =>
	pipe(custom_stddev(smoother), divideBy(new Decimal(period).sqrt()))

export const custom_volatility = (duration: number, smoother: Smoother) =>
	pipe(
		mapWithLast((input: Decimal, last) => input.div(last).minus(1)),
		custom_stddev(smoother),
		multiplyBy(new Decimal(duration).sqrt()),
	)

export const variance = (period: number) => custom_variance(sma(period))
export const stddev = (period: number) => custom_stddev(sma(period))
export const stderr = (period: number) => custom_stderr(period, sma(period))
export const volatility = (period: number) =>
	custom_volatility(252, sma(period))

export const custom_apo = (short: Smoother, long: Smoother) =>
	minus(short, long)

export const custom_ppo = (short: Smoother, long: Smoother) =>
	oscillators.diff_over_long(short, long)

export const apo = (short: number, long: number) =>
	pipe(custom_apo(ema(short), ema(long)), skip(1))
export const ppo = (short: number, long: number) =>
	pipe(custom_ppo(ema(short), ema(long)), skip(1))

export const custom_macd = (
	short: Smoother,
	long: Smoother,
	signal: Smoother,
	longPeriod: number,
) =>
	pipe(
		minus(short, long),
		skip(longPeriod - 1),
		fork(identity(), signal),
		flatMap(
			(macd, signal): [macd: Decimal, signal: Decimal, histogram: Decimal] => [
				macd,
				signal,
				macd.minus(signal),
			],
		),
	)

export const macd = (short: number, long: number, signal: number) => {
	const isSpecial = short === 12 && long === 26
	return custom_macd(
		custom_ema(isSpecial ? 0.15 : factors.e(short)),
		custom_ema(isSpecial ? 0.075 : factors.e(long)),
		ema(signal),
		long,
	)
}

const gains = mapWithLast((input: Decimal, last) =>
	input.gt(last) ? input.minus(last) : ZERO,
)
const losses = mapWithLast((input: Decimal, last) =>
	input.lt(last) ? last.minus(input) : ZERO,
)

export const custom_cmo = (smoother: Smoother) =>
	oscillators.diff_over_sum(pipe(gains, smoother), pipe(losses, smoother))

export const custom_rsi = (smoother: Smoother) =>
	oscillators.short_over_sum(pipe(gains, smoother), pipe(losses, smoother))

export const custom_stochrsi = (period: number, smoother: Smoother) =>
	pipe(custom_rsi(smoother), stoch(identity(), max(period), min(period)))

export const rsi = (period: number) => custom_rsi(wilders(period))

export const stochrsi = (period: number) =>
	custom_stochrsi(period, wilders(period))

export const cmo = (period: number) => custom_cmo(sum(period))

export const custom_dpo = (period: number, smoother: Smoother) =>
	minus(lag(Math.floor(period / 2) + 1, ZERO), smoother)

export const dpo = (period: number) => custom_dpo(period, sma(period))

export const mom = (period: number) =>
	pipe(
		forkWithLag<Decimal>(period),
		flatMap((head, tail) => head.minus(tail)),
	)

export const roc = (period: number) =>
	pipe(
		forkWithLag<Decimal>(period),
		flatMap((head, tail) => head.minus(tail).div(tail)),
	)

export const rocr = (period: number) =>
	pipe(
		forkWithLag<Decimal>(period),
		flatMap((head, tail) => head.div(tail)),
	)

export const vhf = (period: number) =>
	pipe(
		fork(
			pipe(
				mapWithLast((val: Decimal, last) => val.minus(last).abs()),
				sum(period),
			),
			max(period),
			min(period),
		),
		flatMap((sum, max, min) => max.minus(min).abs().div(sum)),
	)

export const bbands = (period: number, scale: number) =>
	pipe(
		fork(sma(period), custom_stddev(sma(period))),
		flatMap(
			(middle, stddev): [lower: Decimal, middle: Decimal, upper: Decimal] => {
				const dev = stddev.times(scale)
				return [middle.minus(dev), middle, middle.plus(dev)]
			},
		),
	)

export const custom_vidya = (
	short: Smoother,
	long: Smoother,
	factor: number,
	long_period: number,
) =>
	pipe(
		fastFork(
			pipe(
				fork(custom_stddev(short), custom_stddev(long)),
				flatMap((short, long) => short.div(long).times(factor)),
			),
			identity(),
		),
		skip(long_period - 2),
		scan(
			(vidya, [s, val], index) =>
				index > 0 ? val.times(s).plus(vidya.times(ONE.minus(s))) : val,
			ZERO,
		),
	)

export const vidya = (short: number, long: number, factor: number) =>
	custom_vidya(sma(short), sma(long), factor, long)

export const linregslope = (period: number) => {
	const x = (period * (period + 1)) / 2
	const x2 = (period * (period + 1) * (period * 2 + 1)) / 6
	const bd = period * x2 - x * x
	return pipe(
		fork(weighted_sum(period), sum(period)),
		flatMap((xy, y) => xy.times(period).minus(y.times(x)).div(bd)),
	)
}

const linreg_forecast = (period: number, forecast: number) => {
	const x = forecast - (period + 1) / 2
	return pipe(
		fork(sma(period), linregslope(period)),
		flatMap((y, b) => y.plus(b.times(x))),
	)
}

export const linregintercept = (period: number) => linreg_forecast(period, 1)

export const linreg = (period: number) => linreg_forecast(period, period)

export const tsf = (period: number) => linreg_forecast(period, period + 1)

export const fosc = (period: number) =>
	oscillators.diff_over_short(identity(), pipe(tsf(period), lag(1)))

export const msw = (period: number) =>
	pipe(
		memAll<Decimal>(period, true),
		skip(1),
		map((inputs) => {
			let rp = ZERO
			let ip = ZERO
			for (let i = 0; i < period; i++) {
				const weight = inputs.get(i)
				const a = new Decimal((2 * Math.PI * i) / period)
				rp = rp.plus(a.cos().times(weight))
				ip = ip.plus(a.sin().times(weight))
			}
			let phase = rp.abs().gt(0.001)
				? ip.div(rp).atan()
				: new Decimal(Math.PI * (ip.lt(0) ? -1 : 1))
			if (rp.lt(0)) {
				phase = phase.plus(Math.PI)
			}
			phase = phase.plus(Math.PI / 2)
			if (phase.lt(0)) {
				phase = phase.plus(2 * Math.PI)
			}
			if (phase.gt(2 * Math.PI)) {
				phase = phase.minus(2 * Math.PI)
			}
			return [phase.sin(), phase.plus(Math.PI / 4).sin()]
		}),
	)
