import { double } from './double';

export class Store {
  #values: Map<string, number[]> = new Map();

  doubled(): number[] {
    return this.#values.values().map((values) => values.flat()).toArray().flat().map(double);
  }
}
