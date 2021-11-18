import {
	Stream,
	Handler,
	Matcher,
	invariant,
	makeOperator,
	makeStatefulMap,
} from './utils'

class Router<T> {
	private h: Handler<T>[] = []
	private s = (next: Handler<T>) => {
		this.h.push(next)
	}
	push(value: T) {
		for (let i = 0; i < this.h.length; i++) {
			this.h[i](value)
		}
	}
	add<A>(op: Stream<T, A>, next: Handler<A>) {
		op.fn(this.s)(next)
	}
}

class RollingList<T> {
	private items: T[]
	public length = 0
	constructor(public size: number) {
		this.items = Array<T>(size)
	}
	public push(item: T): T | undefined {
		const index = this.length % this.size
		const current = this.items[index]
		this.items[index] = item
		this.length += 1
		return current
	}
	public get(index: number): T {
		invariant(
			index >= 0 && index < this.length && index >= this.length - this.size,
			'RollingList index out of bounds',
		)
		const item = this.items[index % this.size]
		invariant(item, 'Rolling List item is undefined')
		return item
	}
}

const self = <T>(x: T): T => x

export function identity<T>() {
	return new Stream<T, T>(self)
}

export function map<P, R>(callback: (value: P, index: number) => R) {
	return makeStatefulMap<P, R>(() => {
		let i = 0
		return (value) => callback(value, i++)
	})
}

export function scan<P, R>(
	callback: (accumulator: R, value: P, index: number) => R,
	initialValue: R,
) {
	return makeStatefulMap<P, R>(() => {
		let state: R = initialValue
		let i = 0
		return (value) => {
			state = callback(state, value, i++)
			return state
		}
	})
}

export function skip<P>(count: number) {
	return makeOperator<P, P>((next) => {
		let i = 0
		return (value) => {
			if (++i > count) {
				next(value)
			}
		}
	}, count)
}

export function flatMap<T extends unknown[], R>(mapper: (...args: T) => R) {
	return makeStatefulMap<T, R>(() => (value) => mapper(...value))
}

export function mapWithLast<T, R>(
	mapper: (value: T, prev: T) => R,
	firstResult?: R,
) {
	return makeOperator<T, R>(
		(next) => {
			let prev: T | undefined
			return (val) => {
				if (prev !== undefined) {
					next(mapper(val, prev))
				} else if (firstResult !== undefined) {
					next(firstResult)
				}
				prev = val
			}
		},
		firstResult !== undefined ? 0 : 1,
	)
}

export function lag<T>(period: number, initialValue?: T) {
	invariant(period > 0, 'Lag period must be at least 1')
	return makeOperator<T, T>(
		(next) => {
			if (period === 1) {
				let prev = initialValue
				return (val) => {
					const value = prev
					if (value !== undefined) next(value)
					prev = val
				}
			} else {
				const inputs = new RollingList<T>(period)
				return (head) => {
					const tail = inputs.push(head)
					const value = tail ?? initialValue
					if (value !== undefined) next(value)
				}
			}
		},
		initialValue !== undefined ? 0 : period,
	)
}

export function forkWithLag<T>(period: number, initialValue?: T) {
	return makeOperator<T, [T, T]>(
		(next) => {
			if (period === 1) {
				let prev = initialValue
				return (val) => {
					if (prev !== undefined) next([val, prev])
					prev = val
				}
			} else {
				const inputs = new RollingList<T>(period)
				return (head) => {
					const tail = inputs.push(head) ?? initialValue
					if (tail !== undefined) next([head, tail])
				}
			}
		},
		initialValue !== undefined ? 0 : period,
	)
}

export function memAll<T>(period: number) {
	return makeStatefulMap<T, RollingList<T>>(() => {
		const inputs = new RollingList<T>(period)
		return (head) => {
			inputs.push(head)
			return inputs
		}
	})
}

export function matchItem<T>(period: number, matcher: Matcher<T>) {
	return makeOperator<T, [T, number]>((next) => {
		const inputs = new RollingList<T>(period)
		let result: T
		let resultIndex = -1
		let index = -1
		return (input: T) => {
			index += 1
			inputs.push(input)
			if (index < inputs.size - 1) {
				return
			}
			const trail = index - inputs.size + 1
			if (resultIndex < trail) {
				result = inputs.get(trail)
				resultIndex = trail
				for (let i = trail; i <= index; i += 1) {
					const item = inputs.get(i)
					if (matcher(result, item)) {
						result = item
						resultIndex = i
					}
				}
			} else if (matcher(result, input)) {
				result = input
				resultIndex = index
			}
			next([result, resultIndex])
		}
	}, period - 1)
}

export function mapFork<T, R extends Record<string, unknown>>(ops: {
	[key in keyof R]: Stream<T, R[key]>
}) {
	const keys = Object.keys(ops) as (keyof R)[]
	let lb = 0
	for (const key of keys) {
		if (ops[key].lb > lb) lb = ops[key].lb
	}
	return makeOperator<T, R>((next) => {
		let values: Partial<R> = {}
		const subject = new Router<T>()
		for (const key of keys) {
			subject.add(ops[key], (value) => {
				values[key] = value
			})
		}
		let i = 0
		return (value) => {
			subject.push(value)
			if (++i > lb) {
				next(values as R)
				values = {}
			}
		}
	}, lb)
}

export function listFork<T, R>(ops: readonly Stream<T, R>[]): Stream<T, R[]> {
	let lb = ops[0].lb
	for (let i = 1; i < ops.length; i++) {
		if (ops[i].lb > lb) lb = ops[i].lb
	}
	return makeOperator((next) => {
		let values = Array(ops.length)
		const subject = new Router<T>()
		for (let i = 0; i < ops.length; i++) {
			const index = i
			subject.add(ops[index], (value) => {
				values[index] = value
			})
		}
		let i = 0
		return (value) => {
			subject.push(value)
			if (++i > lb) {
				next(values as R[])
				values = Array(ops.length)
			}
		}
	}, lb)
}

export function fastListFork<T, R>(
	ops: readonly Stream<T, R>[],
): Stream<T, R[]> {
	return makeOperator((next) => {
		let values = Array(ops.length)
		const subject = new Router<T>()
		for (let i = 0; i < ops.length; i++) {
			const index = i
			subject.add(ops[index], (value) => {
				values[index] = value
			})
		}
		return (value) => {
			subject.push(value)
			next(values as R[])
			values = Array(ops.length)
		}
	})
}

export function fork<T, T1, T2>(
	op1: Stream<T, T1>,
	op2: Stream<T, T2>,
): Stream<T, [T1, T2]>
export function fork<T, T1, T2, T3>(
	op1: Stream<T, T1>,
	op2: Stream<T, T2>,
	op3: Stream<T, T3>,
): Stream<T, [T1, T2, T3]>
export function fork<T, T1, T2, T3, T4>(
	op1: Stream<T, T1>,
	op2: Stream<T, T2>,
	op3: Stream<T, T3>,
	op4: Stream<T, T4>,
): Stream<T, [T1, T2, T3, T4]>
export function fork<T, T1, T2, T3, T4, T5>(
	op1: Stream<T, T1>,
	op2: Stream<T, T2>,
	op3: Stream<T, T3>,
	op4: Stream<T, T4>,
	op5: Stream<T, T5>,
): Stream<T, [T1, T2, T3, T4, T5]>

export function fork<T>(
	...ops: readonly Stream<T, unknown>[]
): Stream<T, unknown[]> {
	return listFork(ops)
}

export function fastFork<T, T1, T2>(
	op1: Stream<T, T1>,
	op2: Stream<T, T2>,
): Stream<T, [T1, T2]>
export function fastFork<T, T1, T2, T3>(
	op1: Stream<T, T1>,
	op2: Stream<T, T2>,
	op3: Stream<T, T3>,
): Stream<T, [T1, T2, T3]>
export function fastFork<T, T1, T2, T3, T4>(
	op1: Stream<T, T1>,
	op2: Stream<T, T2>,
	op3: Stream<T, T3>,
	op4: Stream<T, T4>,
): Stream<T, [T1, T2, T3, T4]>
export function fastFork<T, T1, T2, T3, T4, T5>(
	op1: Stream<T, T1>,
	op2: Stream<T, T2>,
	op3: Stream<T, T3>,
	op4: Stream<T, T4>,
	op5: Stream<T, T5>,
): Stream<T, [T1, T2, T3, T4, T5]>

export function fastFork<T>(
	...ops: readonly Stream<T, unknown>[]
): Stream<T, unknown[]> {
	return fastListFork(ops)
}

export function pipe<T, A, B>(
	op1: Stream<T, A>,
	op2: Stream<A, B>,
): Stream<T, B>
export function pipe<T, A, B, C>(
	op1: Stream<T, A>,
	op2: Stream<A, B>,
	op3: Stream<B, C>,
): Stream<T, C>
export function pipe<T, A, B, C, D>(
	op1: Stream<T, A>,
	op2: Stream<A, B>,
	op3: Stream<B, C>,
	op4: Stream<C, D>,
): Stream<T, D>
export function pipe<T, A, B, C, D, E>(
	op1: Stream<T, A>,
	op2: Stream<A, B>,
	op3: Stream<B, C>,
	op4: Stream<C, D>,
	op5: Stream<D, E>,
): Stream<T, E>
export function pipe<T, A, B, C, D, E, F>(
	op1: Stream<T, A>,
	op2: Stream<A, B>,
	op3: Stream<B, C>,
	op4: Stream<C, D>,
	op5: Stream<D, E>,
	op6: Stream<E, F>,
): Stream<T, F>
export function pipe<T, A, B, C, D, E, F, G>(
	op1: Stream<T, A>,
	op2: Stream<A, B>,
	op3: Stream<B, C>,
	op4: Stream<C, D>,
	op5: Stream<D, E>,
	op6: Stream<E, F>,
	op7: Stream<F, G>,
): Stream<T, G>
export function pipe<T, A, B, C, D, E, F, G, H>(
	op1: Stream<T, A>,
	op2: Stream<A, B>,
	op3: Stream<B, C>,
	op4: Stream<C, D>,
	op5: Stream<D, E>,
	op6: Stream<E, F>,
	op7: Stream<F, G>,
	op8: Stream<G, H>,
): Stream<T, H>
export function pipe<T, A, B, C, D, E, F, G, H, I>(
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
export function pipe<T, A, B, C, D, E, F, G, H, I>(
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

export function pipe(
	...ops: Stream<unknown, unknown>[]
): Stream<unknown, unknown> {
	let lb = 0
	for (let i = 0; i < ops.length; i++) {
		lb += ops[i].lb
	}
	return new Stream((input) => {
		let s = input
		for (let i = 0; i < ops.length; i++) {
			s = ops[i].fn(s)
		}
		return s
	}, lb)
}
