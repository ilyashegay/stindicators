type Handler<T> = (value: T) => void

export class Stream<P, R> {
	constructor(
		public fn: (
			stream: (next: Handler<P>) => void,
		) => (next: Handler<R>) => void,
		public lb = 0,
	) {}
	public pipe<T>(op: Stream<R, T>) {
		return new Stream<P, T>((source) => op.fn(this.fn(source)), this.lb + op.lb)
	}
	public init() {
		let n: Handler<P> | undefined
		let v: R | undefined
		this.fn((next) => {
			n = next
		})((value) => {
			v = value
		})
		return (value: P) => {
			n?.(value)
			return v
		}
	}
}

export type StreamMap<T, R extends Record<string, unknown>> = {
	[key in keyof R]: Stream<T, R[key]>
}

function invariant(condition: unknown, message?: string): asserts condition {
	if (!condition) throw new Error(message)
}

class Router<T> {
	private h: Handler<T>[] = []
	private s = (next: Handler<T>) => {
		this.h.push(next)
	}
	public push(value: T) {
		for (let i = 0; i < this.h.length; i++) {
			this.h[i](value)
		}
	}
	public add<A>(op: Stream<T, A>, next: Handler<A>) {
		op.fn(this.s)(next)
	}
}

class RollingList<T> {
	private items: T[]
	public length = 0
	public index = -1
	constructor(public size: number) {
		invariant(size > 0)
		this.items = Array<T>(size)
	}
	public push(item: T): T | undefined {
		const index = this.length % this.size
		const current = this.items[index]
		this.items[index] = item
		this.length++
		this.index++
		return current
	}
	public get(index = 0): T {
		invariant(
			index >= 0 && index < this.size && index < this.length,
			'RollingList index out of bounds',
		)
		return this.items[(this.index - index) % this.size]
	}
}

export const identity = <T>() => new Stream<T, T>((x) => x)

export const makeOperator = <P, R>(
	fn: (next: Handler<R>) => Handler<P>,
	lb = 0,
) => new Stream<P, R>((source) => (next) => source(fn(next)), lb)

export const makeStatefulMap = <P, R>(fn: () => (value: P) => R) =>
	new Stream<P, R>((source) => (next) => {
		const mapper = fn()
		source((value) => next(mapper(value)))
	})

export const map = <P, R>(callback: (value: P, index: number) => R) =>
	makeStatefulMap<P, R>(() => {
		let i = 0
		return (value) => callback(value, i++)
	})

export const scan = <P, R>(
	callback: (accumulator: R, value: P, index: number) => R,
	initialValue: R,
) =>
	makeStatefulMap<P, R>(() => {
		let state: R = initialValue
		let i = 0
		return (value) => {
			state = callback(state, value, i++)
			return state
		}
	})

export const skip = <P>(count: number) =>
	makeOperator<P, P>((next) => {
		let i = 0
		return (value) => {
			if (++i > count) {
				next(value)
			}
		}
	}, count)

export const flatMap = <T extends unknown[], R>(mapper: (...args: T) => R) =>
	makeStatefulMap<T, R>(() => (value) => mapper(...value))

export const mapWithLast = <T, R>(
	mapper: (value: T, prev: T) => R,
	firstResult?: R,
) =>
	makeOperator<T, R>(
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

export const lag = <T>(period: number, initialValue?: T) =>
	makeOperator<T, T>(
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

export const forkWithLag = <T>(period: number, initialValue?: T) =>
	makeOperator<T, [T, T]>(
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

export const memAll = <T>(period: number, skip = false) =>
	makeOperator<T, RollingList<T>>(
		(next) => {
			const inputs = new RollingList<T>(period)
			return (head) => {
				inputs.push(head)
				if (!skip || inputs.length >= inputs.size) next(inputs)
			}
		},
		skip ? period - 1 : 0,
	)

export type Matcher<T> = (current: T, next: T) => boolean

export const matchItem = <T>(period: number, matcher: Matcher<T>) =>
	memAll<T>(period, true).pipe(
		makeStatefulMap(() => {
			let d = period - 1
			return (inputs) => {
				if (++d < period) {
					if (matcher(inputs.get(d), inputs.get())) {
						d = 0
					}
					return inputs.get(d)
				}
				d = period - 1
				for (let i = period - 2; i >= 0; i--) {
					if (matcher(inputs.get(d), inputs.get(i))) {
						d = i
					}
				}
				return inputs.get(d)
			}
		}),
	)

export const matchDistance = <T>(period: number, matcher: Matcher<T>) =>
	memAll<T>(period, true).pipe(
		scan((prev, inputs) => {
			let next = prev + 1
			if (next < period) {
				return matcher(inputs.get(next), inputs.get()) ? 0 : next
			}
			next = prev
			for (let i = period - 2; i >= 0; i--) {
				if (matcher(inputs.get(next), inputs.get(i))) {
					next = i
				}
			}
			return next
		}, period - 1),
	)

export function mapFork<T, R extends Record<string, unknown>>(
	ops: StreamMap<T, R>,
) {
	const keys = Object.keys(ops) as (keyof R)[]
	let lb = 0
	for (const key of keys) {
		if (ops[key].lb > lb) lb = ops[key].lb
	}
	return makeOperator<T, R>((next) => {
		let values: Partial<R> = {}
		const router = new Router<T>()
		for (const key of keys) {
			router.add(ops[key], (value) => {
				values[key] = value
			})
		}
		let i = 0
		return (value) => {
			router.push(value)
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
		const router = new Router<T>()
		for (let i = 0; i < ops.length; i++) {
			const index = i
			router.add(ops[index], (value) => {
				values[index] = value
			})
		}
		let i = 0
		return (value) => {
			router.push(value)
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
		const router = new Router<T>()
		for (let i = 0; i < ops.length; i++) {
			const index = i
			router.add(ops[index], (value) => {
				values[index] = value
			})
		}
		return (value) => {
			router.push(value)
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
