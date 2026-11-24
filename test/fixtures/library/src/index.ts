import { double } from './double';

export class Store {
  #values: Map<string, number[]> = new Map();

  doubled(): number[] {
    return this.#values
      .values()
      .map((values) => values.flat())
      .toArray()
      .flat()
      .map(double);
  }
}

// explicit resource management still needs a Babel helper for the default targets
export function read(resource: Disposable & { value: number }): number {
  using disposable = resource;
  return disposable.value;
}
