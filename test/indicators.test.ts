import Decimal from 'decimal.js'
import { test } from 'uvu'
import * as assert from 'uvu/assert'

import * as I from '../src/indicators'
import * as T from '../src/tulind'
import * as M from '../src/math.operators'
import { IndicatorFnRecord } from '../src/utils'

import META from './indicators.meta'
import DATA from './indicators.data'

type Input = Record<string, Decimal> | Decimal | Decimal[]

const MAX_ROUNDING_MARGIN = 4

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
} as unknown as IndicatorFnRecord<Input>

function getInputs(inputNames: string[], inputLists: number[][]) {
	const inputLength = inputLists[0].length
	let inputs: Input[] = []
	if (inputLists.length === 1 && inputNames[0] === 'real') {
		inputs = inputLists[0].map((n) => new Decimal(n))
	} else if (inputNames.every((name) => name === 'real')) {
		for (let i = 0; i < inputLength; i += 1) {
			inputs.push(
				inputNames.map((key, index) => new Decimal(inputLists[index][i])),
			)
		}
	} else {
		for (let i = 0; i < inputLength; i += 1) {
			const candle: Input = {}
			inputNames.forEach((key, index) => {
				candle[key] = new Decimal(inputLists[index][i])
			})
			inputs.push(candle)
		}
	}
	return inputs
}

function getAnswers(answerLists: number[][]) {
	if (answerLists.length === 1) {
		return answerLists[0]
	}
	const answers = []
	const length = answerLists[0].length
	for (let i = 0; i < length; i++) {
		const tuple = []
		for (const list of answerLists) {
			tuple.push(list[i])
		}
		answers.push(tuple)
	}
	return answers
}

function roundNumber(received: Decimal, expected: number): unknown {
	if (!Decimal.isDecimal(received)) {
		return received
	}
	if (typeof expected !== 'number') {
		return received.toNumber()
	}
	const y = expected.toString()
	const yd = y.indexOf('.')
	const x = received.toFixed(yd >= 0 ? y.length - yd - 1 : 0)
	const xd = x.indexOf('.')
	if (x === y) {
		return Number.parseFloat(x)
	}
	const ix = Number.parseInt(xd >= 0 ? x.slice(0, xd) + x.slice(xd + 1) : x)
	const iy =
		yd >= 0 ? Number.parseInt(y.slice(0, yd) + y.slice(yd + 1)) : expected
	if (Math.abs(ix - iy) <= MAX_ROUNDING_MARGIN) {
		return expected
	} else {
		return Number.parseFloat(x)
	}
}

function roundList(received: unknown[], expected: number[] | number[][]) {
	const length = Math.max(received.length, expected.length)
	const rounded: unknown[] = []
	for (let i = 0; i < length; i += 1) {
		rounded.push(roundAny(received[i], expected[i]))
	}
	return rounded
}

function roundAny(received: unknown, expected: number | number[] | number[][]) {
	return Array.isArray(expected)
		? Array.isArray(received)
			? roundList(received as unknown[], expected)
			: received
		: Decimal.isDecimal(received)
		? roundNumber(received as Decimal, expected)
		: received
}

const remaining = new Set(Object.keys(indicators))

for (const data of DATA) {
	const [title, ...lists] = data
	const [id, ...args] = title.split(' ')
	const fn = indicators[id]
	if (!fn) continue
	remaining.delete(id)

	test(title, () => {
		const meta = META[id]
		const inputs = getInputs(meta.input_names, lists.slice(0, meta.inputs))
		const answers = getAnswers(lists.slice(meta.inputs))
		const results: unknown[] = []
		const mapper = fn(...args.map(parseFloat)).init()
		for (const input of inputs) {
			const result = mapper(input)
			if (result !== undefined) {
				results.push(result)
			}
		}
		assert.is(
			results.length,
			answers.length,
			`returns ${answers.length} results`,
		)
		const rounded = roundList(results, answers)
		assert.equal(rounded, answers, `returns correct results`)
	})
}

test('all indicators are tested', () => {
	assert.is(remaining.size, 0)
})

test.run()
