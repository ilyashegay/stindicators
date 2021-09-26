import {
	Decimal,
	Candle,
	Smoother,
	Matcher,
	makeStatefulMap,
	ZERO,
	ONE,
	HUNDRED,
} from './utils'
import {
	pipe,
	fork,
	scan,
	map,
	skip,
	identity,
	memAll,
	flatMap,
	forkWithLag,
	mapWithLast,
} from './flow.operators'
import * as M from './math.operators'

const MIN_VOLUME = new Decimal(0.00000001)

export const openprice = map((candle: Candle) => candle.open)
export const highprice = map((candle: Candle) => candle.high)
export const lowprice = map((candle: Candle) => candle.low)
export const closeprice = map((candle: Candle) => candle.close)
export const volume = map((candle: Candle) => candle.volume)

const nzvolume = map((candle: Candle) =>
	candle.volume.gt(0) ? candle.volume : MIN_VOLUME,
)

export const range = map((candle: Candle) => candle.high.minus(candle.low))

export const avgprice = map((candle: Candle) =>
	candle.open.plus(candle.high).plus(candle.low).plus(candle.close).div(4),
)

export const medprice = map((candle: Candle) =>
	candle.high.plus(candle.low).div(2),
)

export const typprice = map((candle: Candle) =>
	candle.high.plus(candle.low).plus(candle.close).div(3),
)

export const wcprice = map((candle: Candle) =>
	candle.high.plus(candle.low).plus(candle.close).plus(candle.close).div(4),
)

export const ad = scan((ad: Decimal, candle: Candle) => {
	const hl = candle.high.minus(candle.low)
	if (hl.eq(0)) return ad
	return ad.plus(
		candle.close
			.minus(candle.low)
			.minus(candle.high)
			.plus(candle.close)
			.div(hl)
			.times(candle.volume),
	)
}, ZERO)

export const adosc = (short: Smoother, long: Smoother) =>
	pipe(ad, M.minus(short, long))

export const ao = pipe(medprice, M.minus(M.sma(5), M.sma(34)))

const aroonify = (period: number) => {
	const factor = HUNDRED.div(period)
	return map((distance: number) => factor.times(period - distance))
}

const aroon_up = (period: number) =>
	pipe(highprice, M.max_distance(period + 1), aroonify(period))

const aroon_down = (period: number) =>
	pipe(lowprice, M.min_distance(period + 1), aroonify(period))

export const aroon = (period: number) =>
	fork(aroon_down(period), aroon_up(period))

export const aroonosc = (period: number) =>
	M.minus(aroon_up(period), aroon_down(period))

export const adx = (dm_smoother: Smoother, dx_smoother: Smoother) =>
	pipe(dx(dm_smoother), dx_smoother)

export const adxr = (
	dm_smoother: Smoother,
	dx_smoother: Smoother,
	period: number,
) =>
	pipe(
		adx(dm_smoother, dx_smoother),
		forkWithLag(period - 1),
		flatMap((head, tail) => head.plus(tail).div(2)),
	)

export const atr = (smoother: Smoother, skipFirst: boolean) =>
	pipe(tr(skipFirst), smoother)

export const di = (dm_smoother: Smoother, tr_smoother: Smoother) =>
	fork(
		M.div(dm_up_smooth(dm_smoother), atr(tr_smoother, true), HUNDRED),
		M.div(dm_down_smooth(dm_smoother), atr(tr_smoother, true), HUNDRED),
	)

export const dm_up = mapWithLast((candle: Candle, last) => {
	const up = candle.high.minus(last.high)
	const down = last.low.minus(candle.low)
	return up.gt(down) && up.gt(0) ? up : ZERO
}, ZERO)

export const dm_down = mapWithLast((candle: Candle, last) => {
	const up = candle.high.minus(last.high)
	const down = last.low.minus(candle.low)
	return down.gt(up) && down.gt(0) ? down : ZERO
}, ZERO)

const dm_up_smooth = (smoother: Smoother) => pipe(dm_up, smoother)
const dm_down_smooth = (smoother: Smoother) => pipe(dm_down, smoother)

export const dm = (smoother: Smoother) =>
	fork(dm_up_smooth(smoother), dm_down_smooth(smoother))

export const dx = (dm_smoother: Smoother) =>
	pipe(
		M.oscillators.diff_over_sum(
			dm_up_smooth(dm_smoother),
			dm_down_smooth(dm_smoother),
		),
		map((val) => val.abs()),
	)

export const tr = (skipFirst = false) =>
	makeStatefulMap<Candle, Decimal>(() => {
		let prev: Candle | undefined
		return (candle) => {
			const last = prev
			prev = candle
			return last
				? Decimal.max(
						candle.high.minus(candle.low),
						candle.high.minus(last.close).abs(),
						candle.low.minus(last.close).abs(),
				  )
				: skipFirst
				? ZERO
				: candle.high.minus(candle.low)
		}
	})

export const cci = (period: number) =>
	pipe(
		typprice,
		fork(identity(), M.sma(period), M.md(period)),
		skip(period - 1),
		flatMap((tp, atp, md) => tp.minus(atp).div(md.times(0.015))),
	)

export const bop = map((candle: Candle) =>
	candle.close.minus(candle.open).div(candle.high.minus(candle.low)),
)

export const cvi = (period: number, smoother: Smoother) =>
	pipe(range, smoother, M.roc(period), M.multiplyBy(HUNDRED))

export const emv = (scale: number) =>
	pipe(
		fork(
			pipe(
				medprice,
				mapWithLast((hl, last) => hl.minus(last)),
			),
			marketfi,
		),
		flatMap((hl, marketfi) => hl.times(marketfi).times(scale)),
	)

export const marketfi = map((candle: Candle) =>
	candle.high.minus(candle.low).div(candle.volume),
)

const kvo_trend = pipe(
	map((candle: Candle) => candle.high.plus(candle.low).plus(candle.close)),
	makeStatefulMap(() => {
		let trend: 1 | -1 = -1
		let prev: Decimal | undefined
		return (hlc) => {
			if (prev && hlc.gt(prev)) {
				trend = 1
			}
			if (prev && hlc.lt(prev)) {
				trend = -1
			}
			prev = hlc
			return trend
		}
	}),
)

const kvo_cm = pipe(
	fork(
		pipe(
			kvo_trend,
			mapWithLast((trend, last) => trend === last, true),
		),
		pipe(range, forkWithLag(1)),
	),
	scan((cm, [trend, [dm, last_dm]]) => (trend ? cm : last_dm).plus(dm), ZERO),
)

export const kvo = (short: Smoother, long: Smoother) =>
	pipe(
		fork(volume, kvo_trend, range, kvo_cm),
		flatMap((volume, trend, dm, cm) =>
			HUNDRED.times(volume)
				.times(trend)
				.times(dm.div(cm).times(2).minus(1).abs()),
		),
		M.minus(short, long),
	)

export const mass = (period: number, ema_period: number, factor: number) =>
	pipe(
		range,
		M.div(M.ema(factor), M.double_ema(ema_period, factor)),
		M.sum(period),
	)

export const mfi = (period: number) =>
	pipe(
		fork(pipe(typprice, forkWithLag(1)), nzvolume),
		M.oscillators.short_over_sum(
			pipe(
				flatMap(([tp, last_tp], volume) =>
					tp.gt(last_tp) ? tp.times(volume) : ZERO,
				),
				M.sum(period),
			),
			pipe(
				flatMap(([tp, last_tp], volume) =>
					tp.lt(last_tp) ? tp.times(volume) : ZERO,
				),
				M.sum(period),
			),
		),
	)

export const natr = (smoother: Smoother) =>
	M.div(atr(smoother, false), closeprice, HUNDRED)

const vi = (condition: Matcher<Decimal>) =>
	pipe(
		fork(
			pipe(volume, mapWithLast(condition, false)),
			pipe(
				closeprice,
				mapWithLast((close, last) => close.minus(last).div(last), ZERO),
			),
		),
		flatMap((check, close) => (check ? close : ZERO)),
		scan((vi, extra) => vi.plus(vi.times(extra)), new Decimal(1000)),
	)

export const pvi = vi((volume, last) => volume.gt(last))
export const nvi = vi((volume, last) => volume.lt(last))

export const obv = pipe(
	fork(
		pipe(
			closeprice,
			mapWithLast((close, last) => close.comparedTo(last), 0),
		),
		volume,
	),
	scan((obv, [change, volume]) => obv.plus(volume.times(change)), ZERO),
)

export const qstick = (period: number) =>
	pipe(
		map((candle: Candle) => candle.close.minus(candle.open)),
		M.sma(period),
	)

export const stoch = (
	fast_k_period: number,
	k_smoother: Smoother,
	d_smoother: Smoother,
) =>
	pipe(
		M.stoch(
			closeprice,
			pipe(highprice, M.max(fast_k_period)),
			pipe(lowprice, M.min(fast_k_period)),
			HUNDRED,
		),
		k_smoother,
		fork(identity(), d_smoother),
	)

export const ultosc = (period1: number, period2: number, period3: number) =>
	pipe(
		fork(highprice, lowprice, pipe(closeprice, forkWithLag(1))),
		flatMap((high, low, [close, prevClose]) => {
			const tl = Decimal.min(low, prevClose)
			const th = Decimal.max(high, prevClose)
			return [close.minus(tl), th.minus(tl)] as const
		}),
		fork(
			pipe(
				map((bpr) => bpr[0]),
				fork(M.sum(period1), M.sum(period2), M.sum(period3)),
			),
			pipe(
				map((bpr) => bpr[1]),
				fork(M.sum(period1), M.sum(period2), M.sum(period3)),
			),
		),
		flatMap(([bp1, bp2, bp3], [r1, r2, r3]) =>
			bp1
				.div(r1)
				.times(4)
				.plus(bp2.div(r2).times(2))
				.plus(bp3.div(r3))
				.times(HUNDRED)
				.div(7),
		),
	)

export const vosc = (fast: number, slow: number) =>
	pipe(nzvolume, M.oscillators.diff_over_long(M.sma(fast), M.sma(slow)))

export const wad = pipe(
	fork(highprice, lowprice, pipe(closeprice, forkWithLag(1))),
	flatMap((high, low, [close, prevClose]) => {
		if (close.gt(prevClose)) {
			return close.minus(Decimal.min(low, prevClose))
		}
		if (close.lt(prevClose)) {
			return close.minus(Decimal.max(high, prevClose))
		}
		return ZERO
	}),
	scan((wad, ad) => wad.plus(ad), ZERO),
)

export const willr = (period: number) =>
	M.stoch(
		closeprice,
		pipe(lowprice, M.min(period)),
		pipe(highprice, M.max(period)),
		-100,
	)

export const vwma = (period: number) =>
	M.div(
		pipe(
			map((candle: Candle) => candle.volume.times(candle.close)),
			M.sum(period),
		),
		pipe(nzvolume, M.sum(period)),
	)

export const fisher = (period: number) =>
	pipe(
		medprice,
		M.stoch(identity(), M.max(period), M.min(period)),
		scan((res, val) => val.minus(0.5).times(0.66).plus(res.times(0.67)), ZERO),
		map((val) =>
			val.gt(0.99)
				? new Decimal(0.999)
				: val.lt(-0.99)
				? new Decimal(-0.999)
				: val,
		),
		map((val) => ONE.plus(val).div(ONE.minus(val)).ln()),
		scan((fisher, val) => val.times(0.5).plus(fisher.times(0.5)), ZERO),
		forkWithLag(1, ZERO),
	)

export const psar = (accel_step: number, accel_max: number) =>
	pipe(
		fork(pipe(highprice, memAll(3)), pipe(lowprice, memAll(3)), M.index),
		skip(1),
		makeStatefulMap(() => {
			let lng: boolean
			let sar: Decimal
			let extreme: Decimal
			let accel = accel_step
			return ([highs, lows, index]) => {
				const high = highs.get(index)
				const low = lows.get(index)
				if (index === 1) {
					const lastHigh = highs.get(index - 1)
					const lastLow = lows.get(index - 1)
					lng = lastHigh.plus(lastLow).lte(high.plus(low))
					if (lng) {
						extreme = lastHigh
						sar = lastLow
					} else {
						extreme = lastLow
						sar = lastHigh
					}
				}
				sar = extreme.minus(sar).times(accel).plus(sar)
				if (lng) {
					if (index >= 2) {
						sar = Decimal.min(sar, lows.get(index - 2))
					}
					sar = Decimal.min(sar, lows.get(index - 1))
					if (high > extreme) {
						extreme = high
						accel = Math.min(accel_max, accel + accel_step)
					}
					if (low < sar) {
						sar = extreme
						extreme = low
						accel = accel_step
						lng = false
					}
				} else {
					if (index >= 2) {
						sar = Decimal.max(sar, highs.get(index - 2))
					}
					sar = Decimal.max(sar, highs.get(index - 1))
					if (low < extreme) {
						extreme = low
						accel = Math.min(accel_max, accel + accel_step)
					}
					if (high > sar) {
						sar = extreme
						extreme = high
						accel = accel_step
						lng = true
					}
				}
				return sar
			}
		}),
	)
