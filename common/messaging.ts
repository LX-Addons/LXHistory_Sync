export async function sendToBackground<Req, Res>(request: {
  name: string
  body?: Req
}): Promise<Res> {
  const messaging = await import('@plasmohq/messaging')
  return messaging.sendToBackground(
    request as Parameters<typeof messaging.sendToBackground>[0]
  ) as Promise<Res>
}
