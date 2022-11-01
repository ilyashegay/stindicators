import { assert, assertEquals } from 'asserts'
import { Decimal } from 'decimal.js'
import { Candle, IndicatorFn, indicators, operators } from '../src/preset.ts'
import data from './data.json' assert { type: 'json' }

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

type TestIndicatorFn = IndicatorFn<
	Candle | Decimal | Decimal[] | [Decimal, Decimal],
	number | Decimal | Decimal[]
>

const fns = { ...indicators, ...operators } as Record<string, TestIndicatorFn>

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

	Deno.test(`${t.id}(${t.args.join(', ')})`, () => {
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

		assertEquals(
			results.length,
			t.outputs.length,
			`returns ${t.outputs.length} results`,
		)

		const rounded = results.map((r, i) => {
			const o = t.outputs[i]
			if (Array.isArray(r)) {
				assert(Array.isArray(o), 'output is array')
				return r.map((n, i) => round(n, o[i]))
			} else {
				assert(!Array.isArray(o), 'output is not array')
				return round(r, o)
			}
		})

		assertEquals(rounded, t.outputs, `returns correct results`)
	})
}

Deno.test('all indicators are tested', () => {
	assertEquals(Array.from(remaining), [])
})
