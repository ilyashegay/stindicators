import Decimal from 'decimal.js'
import { test } from 'uvu'
import * as assert from 'uvu/assert'

import * as I from '../src/indicators'
import * as T from '../src/tulind'
import * as M from '../src/math.operators'
import { Candle, IndicatorFnRecord } from '../src/utils'

import DATA from './data.json'

const indicators = {
	ad: () => I.ad,
	adosc: T.adosc,
	adx: T.adx,
	adxr: T.adxr,
	ao: () => I.ao,
	apo: T.apo,
	aroon: I.aroon,
	aroonosc: I.aroonosc,
	atr: T.atr,
	bbands: M.bbands,
	bop: () => I.bop,
	cci: I.cci,
	cmo: T.cmo,
	crossany: () => M.crossany,
	crossover: () => M.crossover,
	cvi: T.cvi,
	decay: M.decay,
	dema: T.dema,
	di: T.di,
	dm: T.dm,
	dx: T.dx,
	dpo: T.dpo,
	edecay: M.edecay,
	ema: T.ema,
	emv: () => T.emv,
	fisher: I.fisher,
	fosc: M.fosc,
	hma: M.hma,
	kama: M.kama,
	kvo: T.kvo,
	linreg: M.linreg,
	linregslope: M.linregslope,
	linregintercept: M.linregintercept,
	macd: T.macd,
	marketfi: () => I.marketfi,
	mass: T.mass,
	max: M.max,
	min: M.min,
	mfi: I.mfi,
	md: T.md,
	medprice: () => I.medprice,
	mom: M.mom,
	msw: M.msw,
	natr: T.natr,
	nvi: () => I.nvi,
	obv: () => I.obv,
	ppo: T.ppo,
	psar: I.psar,
	pvi: () => I.pvi,
	qstick: I.qstick,
	roc: M.roc,
	rocr: M.rocr,
	rsi: T.rsi,
	sma: M.sma,
	stoch: T.stoch,
	stochrsi: T.stochrsi,
	stddev: T.stddev,
	stderr: T.stderr,
	tema: T.tema,
	tr: T.tr,
	trima: M.trima,
	trix: T.trix,
	tsf: M.tsf,
	typprice: () => I.typprice,
	var: T.variance,
	ultosc: I.ultosc,
	vhf: M.vhf,
	vidya: T.vidya,
	vosc: I.vosc,
	volatility: T.volatility,
	vwma: I.vwma,
	wad: () => I.wad,
	willr: I.willr,
	wcprice: () => I.wcprice,
	wilders: M.wilders,
	wma: M.wma,
	zlema: T.zlema,
} as unknown as IndicatorFnRecord<
	Candle | Decimal | Decimal[],
	number | Decimal | Decimal[]
>

type Test = {
	id: string
	args: number[]
	inputs: (
		| string
		| string[]
		| { o?: string; h?: string; l?: string; c?: string; v?: string }
	)[]
	outputs: (string | string[])[]
}

/**
 * Returns expected if received is within 0.1% of expected, returns received otherwise.
 */
function round(received: number | Decimal, expected: string) {
	const rd = new Decimal(received)
	const ed = new Decimal(expected)
	const d = rd.sub(ed).abs().toDP(ed.dp())
	const c = (ed.eq(0) ? d : d.div(ed)).lte(0.001)
	return (c ? ed : rd).toFixed()
}

const remaining = new Set(Object.keys(indicators))

for (const t of DATA as Test[]) {
	const fn = indicators[t.id]
	if (!fn) continue
	remaining.delete(t.id)

	test(`${t.id}(${t.args.join(', ')})`, () => {
		const results: (number | Decimal | Decimal[])[] = []
		const mapper = fn(...t.args).init()
		for (const v of t.inputs) {
			const result = mapper(
				typeof v === 'string'
					? new Decimal(v)
					: Array.isArray(v)
					? v.map((n) => new Decimal(n))
					: {
							open: new Decimal(v.o ?? 0),
							high: new Decimal(v.h ?? 0),
							low: new Decimal(v.l ?? 0),
							close: new Decimal(v.c ?? 0),
							volume: new Decimal(v.v ?? 0),
					  },
			)
			if (result !== undefined) {
				results.push(result)
			}
		}

		assert.is(
			results.length,
			t.outputs.length,
			`returns ${t.outputs.length} results`,
		)

		const rounded = results.map((r, i) => {
			const o = t.outputs[i]
			if (Array.isArray(r)) {
				if (!Array.isArray(o)) throw new Error('wrong type')
				return r.map((n, i) => round(n, o[i]))
			} else {
				if (Array.isArray(o)) throw new Error('wrong type')
				return round(r, o)
			}
		})

		assert.equal(rounded, t.outputs, `returns correct results`)
	})
}

test('all indicators are tested', () => {
	assert.is(remaining.size, 0)
})

test.run()
