/** Reads values out of a reply whose shape isn't known until it is checked. */
export class Json {
  readonly #value: unknown;
  readonly #path: string;

  constructor(value: unknown, path = 'reply') {
    this.#value = value;
    this.#path = path;
  }

  get(key: string): Json {
    const value = this.#value;
    if (typeof value !== 'object' || value === null || !Object.hasOwn(value, key)) throw this.#wrong(`an object with "${key}"`);
    return new Json(new Map<string, unknown>(Object.entries(value)).get(key), `${this.#path}.${key}`);
  }

  list(): Json[] {
    if (!Array.isArray(this.#value)) throw this.#wrong('a list');
    return this.#value.map((item: unknown, index) => new Json(item, `${this.#path}[${index}]`));
  }

  text(): string {
    if (typeof this.#value !== 'string') throw this.#wrong('text');
    return this.#value;
  }

  number(): number {
    if (typeof this.#value !== 'number') throw this.#wrong('a number');
    return this.#value;
  }

  flag(): boolean {
    if (typeof this.#value !== 'boolean') throw this.#wrong('true or false');
    return this.#value;
  }

  isNull(): boolean {
    return this.#value === null;
  }

  /** An unknown word is an error, never a nearest match. */
  oneOf<const T>(words: Readonly<Record<string, T>>): T {
    const found = Object.entries(words).find(([word]) => word === this.#value);
    if (found === undefined) throw this.#wrong(`one of ${Object.keys(words).join(', ')}`);
    return found[1];
  }

  #wrong(expected: string): Error {
    return new Error(`GitHub's answer was not understood: ${this.#path} is not ${expected}.`);
  }
}
