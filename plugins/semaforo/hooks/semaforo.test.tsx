import { expect, test } from 'claude-code/testing'

const PANE = {
  component: 'Pane',
  requestId: 'semaforo',
  props: {
    requestId: 'semaforo',
    title: 'Semáforo',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { top: 0, bodyRows: 30 },
    view: {},
  },
} as const

const texto = async ($: any) => {
  const ui = await $.ui.mount({ plugin: 'semaforo', surface: 'desktop', ...PANE } as never)
  const t = (await ui.findAll({ type: 'Text' })).map((x: any) => x.text).join(' | ')
  await ui.unmount()
  return t
}

test('arranca en verde (LISTO) en escritorio y terminal', async $ => {
  for (const surface of ['desktop', 'terminal'] as const) {
    const ui = await $.ui.mount({ plugin: 'semaforo', surface, ...PANE } as never)
    expect(await ui.find({ type: 'Text', text: /LISTO/ })).toBeDefined()
    await ui.unmount()
  }
})

test('tarea de fondo: rojo hasta que llega su aviso de fin', async ($, on) => {
  on('tool.call', () => ({ result: 'Command running in background with ID: abc123. Output is being written to: x' }) as never)
  await $.tool.call({ tool: 'Bash', command: 'sleep 99', run_in_background: true } as never)
  expect(await texto($)).toMatch(/TRABAJANDO.*1 tarea de fondo/)

  await $.session.append({
    message: { role: 'user', content: '<task-notification>\n<task-id>abc123</task-id>\n<status>completed</status>\n</task-notification>' },
  } as never).catch(() => undefined)
  expect(await texto($)).toMatch(/LISTO/)
})

test('botón chico sobre el cuadro de texto', async ($, on) => {
  on('ui.render', ($: any, e: any) => { const { Box } = $.ui.resolve(e); return <Box /> })
  const ui = await $.ui.mount({ plugin: 'semaforo', surface: 'desktop', component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 80, scroll: { top: 0, bodyRows: 10 } } } as never)
  expect(await ui.find({ key: 'semaforo-toggle' })).toBeDefined()
  await ui.unmount()
})

test('un texto con "agentId" en otra herramienta (Read) no es una tarea de fondo', async ($, on) => {
  on('tool.call', () => ({ result: 'docs: pass { agentId: abcdef123 } to resume' }) as never)
  await $.tool.call({ tool: 'Read', file_path: 'x.d.ts' } as never)
  expect(await texto($)).toMatch(/LISTO/)
})

test('TaskStop (argumentos sueltos, como en la app) saca la tarea', async ($, on) => {
  on('tool.call', (_: any, e: any) =>
    (e.tool === 'TaskStop' ? { result: 'stopped' } : { result: 'Command running in background with ID: zz9. Output x' }) as never)
  await $.tool.call({ tool: 'Bash', command: 'sleep 99', run_in_background: true } as never)
  expect(await texto($)).toMatch(/1 tarea de fondo/)
  await $.tool.call({ tool: 'TaskStop', task_id: 'zz9' } as never)
  expect(await texto($)).toMatch(/LISTO/)
})

test('al arrancar la sesión no abre el panel solo (solo con el botón)', async ($, on) => {
  const abiertos: string[] = []
  on('command.register', () => ({ value: undefined }) as never)
  on('ui.open', (_: any, e: any) => { abiertos.push(String(e.id)); return { value: undefined } as never })
  on('store.get', () => ({ value: true }) as never) // aunque antes lo hayas dejado abierto
  await $.session.start({ cwd: '.' } as never).catch(() => undefined)
  expect(abiertos).toEqual([])
})
