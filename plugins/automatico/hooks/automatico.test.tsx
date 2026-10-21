import { expect, mock, test } from 'claude-code/testing'

const BANDA = {
  plugin: 'automatico',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { top: 0, bodyRows: 10 } },
} as const

const TOOL = 'mcp__automatico__automatico'

const boton = async ($: any, surface: 'desktop' | 'terminal') => {
  const ui = await $.ui.mount({ ...BANDA, surface } as never)
  const b = await ui.find({ key: 'automatico-toggle' })
  await ui.unmount()
  return (b as { props?: { label?: string } } | undefined)?.props
}

const llamar = async ($: any, input: Record<string, unknown>) => (await $.tool.call({ tool: TOOL, input } as never)) as any

const base = (on: any) => {
  on('ui.render', ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  on('tool.register', () => ({ value: { tool: TOOL } }))
  on('tool.call', () => ({ result: 'motor' }))
  const store = new Map<string, unknown>()
  on('store.get', (_: any, e: any) => ({ value: store.get(e.key) }))
  on('store.set', (_: any, e: any) => (store.set(e.key, e.value), { value: undefined }))
}

test('botón apagado en escritorio y terminal', async ($, on) => {
  base(on)
  for (const surface of ['desktop', 'terminal'] as const) {
    expect((await boton($, surface))?.label).toBe('🤖 Automático')
  }
})

test('activar por la herramienta: el botón muestra el tope; desactivar lo apaga', async ($, on) => {
  base(on)
  const r = await llamar($, { accion: 'activar', tope: 65, ventana: 'semanal' })
  expect(JSON.parse(r.result).on).toBe(true)
  expect((await boton($, 'desktop'))?.label).toMatch(/Auto ON .*\/65 % sem/)

  await llamar($, { accion: 'tarea', tarea: 'T51 de docs/PLAN-jarvis.md', sesion: 'abc' })
  const est = JSON.parse((await llamar($, { accion: 'estado' })).result)
  expect(est.tarea).toBe('T51 de docs/PLAN-jarvis.md')
  expect(est.sesion).toBe('abc')

  await llamar($, { accion: 'desactivar' })
  expect((await boton($, 'desktop'))?.label).toBe('🤖 Automático')
})

test('activar sin tope se rechaza', async ($, on) => {
  base(on)
  const r = await llamar($, { accion: 'activar' })
  expect(String(r.text ?? r.deny ?? '')).toMatch(/tope/)
})

test('freno: apagado no deja arrancar sesiones auto-*, prendido sí; las demás pasan siempre', async ($, on) => {
  base(on)
  const start = (name: string) =>
    $.tool.call({ tool: 'mcp__ccd_session__start_session', input: { name, prompt: 'x', initiation: 'user_asked' } } as never) as Promise<any>

  const d = await start('auto-t51')
  expect(String(d.text ?? d.deny ?? '')).toMatch(/apagado/)
  expect((await start('otra-cosa')).result).toBe('motor')

  await llamar($, { accion: 'activar', tope: 65 })
  expect((await start('auto-t51')).result).toBe('motor')
})

test('botón prendido: lo apaga y manda "pará"', async ($, on) => {
  base(on)
  const enviados: string[] = []
  on('prompt.submit', (_: any, e: any) => {
    enviados.push(e.text)
    return { drop: 'test' } as never
  })
  await llamar($, { accion: 'activar', tope: 65 })
  const ui = await $.ui.mount({ ...BANDA, surface: 'desktop' } as never)
  await ui.press({ key: 'automatico-toggle' } as never)
  await ui.unmount()
  expect((await boton($, 'desktop'))?.label).toBe('🤖 Automático')
  expect(enviados.join('\n')).toMatch(/Pará el modo automático/)
})

test('botón apagado: escribe "seguí en automático hasta N %" con el último tope (Enter lo manda Nacho)', async ($, on) => {
  base(on)
  const enviados: string[] = []
  on('prompt.fill', (_: any, e: any) => {
    enviados.push(e.text)
    return { isFilled: true } as never
  })
  on('ui.toast', () => ({ value: undefined }) as never)
  await llamar($, { accion: 'activar', tope: 70 })
  await llamar($, { accion: 'desactivar' })
  const ui = await $.ui.mount({ ...BANDA, surface: 'desktop' } as never)
  await ui.press({ key: 'automatico-toggle' } as never)
  await ui.unmount()
  expect(enviados.join('\n')).toMatch(/Seguí en automático hasta 70 % semanal/)
})

test('vigía: con el modo prendido y la ventana quieta, la despierta a los 90 min (o cuando pidió el modelo)', async ($, on) => {
  base(on)
  const reloj = mock.clock(on)
  const enviados: string[] = []
  on('prompt.submit', (_: any, e: any) => {
    enviados.push(e.text)
    return { drop: 'test' } as never
  })
  on('turn.start', (_: any, e: any) => ({ turnId: e.turnId }) as never)
  on('turn.complete', () => ({ text: '' }) as never)
  const turno = async () => {
    await $.turn.start({ turnId: 't' } as never)
    await $.turn.complete({ turnId: 't', answer: 'ok' } as never)
  }

  // apagado: nunca despierta
  await turno()
  await reloj.advance(91 * 60_000)
  expect(enviados.length).toBe(0)

  // prendido: a los 90 min de quieta
  await llamar($, { accion: 'activar', tope: 65 })
  await turno()
  await reloj.advance(89 * 60_000)
  expect(enviados.length).toBe(0)
  await reloj.advance(2 * 60_000)
  expect(enviados.join('\n')).toMatch(/Modo automático: revisá/)

  // el modelo pide despertarse en 5 min
  await llamar($, { accion: 'despertar', minutos: 5 })
  await turno()
  await reloj.advance(6 * 60_000)
  expect(enviados.length).toBe(2)

  // apagado por la herramienta: el timer armado no despierta
  await turno()
  await llamar($, { accion: 'desactivar' })
  await reloj.advance(120 * 60_000)
  expect(enviados.length).toBe(2)
})
