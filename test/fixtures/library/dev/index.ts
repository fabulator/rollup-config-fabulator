import { Store } from '../src';

document.querySelector('#root')!.textContent = String(new Store().doubled());
