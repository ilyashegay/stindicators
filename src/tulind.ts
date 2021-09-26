import * as I from './indicators'
import * as M from './math.operators'
import { pipe, map, skip } from './flow.operators'

const factors = {
	d: (period: number): number => (period - 1) / period,
	e: (period: number): number => 2 / (period + 1),
}

const custom_dm_smoother = (period: number) =>
	M.custom_dm_smoother(period, factors.d(period))

export const adosc = (shortPeriod: number, longPeriod: number) =>
	pipe(I.adosc(ema(shortPeriod), ema(longPeriod)), skip(longPeriod - 1))

export const adx = (period: number) => {
	const smoother = custom_dm_smoother(period)
	return I.adx(
		smoother,
		pipe(
			smoother,
			map((val) => val.div(period)),
		),
	)
}

export const adxr = (period: number) => {
	const smoother = custom_dm_smoother(period)
	return I.adxr(
		smoother,
		pipe(
			smoother,
			map((val) => val.div(period)),
		),
		period,
	)
}

export const tr = () => I.tr(false)
export const atr = (period: number) => I.atr(M.wilders(period), false)
export const dm = (period: number) => I.dm(custom_dm_smoother(period))
export const dx = (period: number) => I.dx(custom_dm_smoother(period))
export const di = (period: number) => {
	const smoother = custom_dm_smoother(period)
	return I.di(smoother, smoother)
}

export const ema = (period: number) => M.ema(factors.e(period))
export const dema = (period: number) => M.dema(period, factors.e(period))

export const variance = (period: number) => M.variance(M.sma(period))
export const md = (period: number) => M.md(period)
export const stddev = (period: number) => M.stddev(M.sma(period))
export const stderr = (period: number) => M.stderr(period, M.sma(period))
export const volatility = (period: number) => M.volatility(252, M.sma(period))

export const apo = (short: number, long: number) =>
	pipe(M.apo(ema(short), ema(long)), skip(1))
export const ppo = (short: number, long: number) =>
	pipe(M.ppo(ema(short), ema(long)), skip(1))
export const macd = (short: number, long: number, signal: number) => {
	const isSpecial = short === 12 && long === 26
	return M.macd(
		M.ema(isSpecial ? 0.15 : factors.e(short)),
		M.ema(isSpecial ? 0.075 : factors.e(long)),
		ema(signal),
		long,
	)
}

export const cvi = (period: number) =>
	I.cvi(period, pipe(ema(period), skip(period - 1)))
export const dpo = (period: number) => M.dpo(period, M.sma(period))

export const emv = I.emv(10000)

export const kvo = (short: number, long: number) => I.kvo(ema(short), ema(long))

export const mass = (period: number) => I.mass(period, 9, factors.e(9))

export const natr = (period: number) => I.natr(M.wilders(period))

export const trix = (period: number) => M.trix(period, factors.e(period))

export const tema = (period: number) => M.tema(period, factors.e(period))

export const stoch = (period1: number, period2: number, period3: number) =>
	I.stoch(period1, M.sma(period2), M.sma(period3))

export const rsi = (period: number) => M.rsi(M.wilders(period))

export const stochrsi = (period: number) =>
	M.stochrsi(period, M.wilders(period))

export const cmo = (period: number) => M.cmo(M.sum(period))

export const vidya = (short: number, long: number, factor: number) =>
	M.vidya(M.sma(short), M.sma(long), factor, long)

export const zlema = (period: number) =>
	M.zlema(factors.e(period), Math.floor((period - 1) / 2))
