import { expect, test } from 'claude-code/testing'

import { register } from './register'

// Un error de sintaxis o de import en register.ts apaga el mod entero (sin tablero ni guardianes): que al menos cargue.
test('register.ts carga', () => {
  expect(typeof register).toBe('function')
})
