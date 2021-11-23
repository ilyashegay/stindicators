import Decimal from 'decimal.js'
import { test } from 'uvu'
import * as assert from 'uvu/assert'
import * as I from '../src/index'
import data from './data.json'

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

type TestIndicatorFn = I.IndicatorFn<
	I.Candle | Decimal | Decimal[] | [Decimal, Decimal],
	number | Decimal | Decimal[]
>

const fns = { ...I.indicators, ...I.operators } as Record<
	string,
	TestIndicatorFn
>

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

const remaining = new Set(Object.keys(fns))

for (const t of data as Test[]) {
	const fn = fns[t.id]
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
				assert.ok(Array.isArray(o), 'output is array')
				return r.map((n, i) => round(n, o[i]))
			} else {
				assert.ok(!Array.isArray(o), 'output is not array')
				return round(r, o)
			}
		})

		assert.equal(rounded, t.outputs, `returns correct results`)
	})
}

test('all indicators are tested', () => {
	assert.equal(Array.from(remaining), [])
})

test.run()
