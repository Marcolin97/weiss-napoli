/**
 * Sends a tournament result embed to a Discord channel via webhook.
 * Does nothing if DISCORD_WEBHOOK_URL is not configured.
 */
export async function sendTournamentResultToDiscord(params: {
  tournamentName: string
  tournamentDate: string
  leagueName: string
  standings: Array<{ placement: number; playerName: string; points: number; isWinner: boolean }>
}): Promise<void> {
  const config = useRuntimeConfig()
  const webhookUrl = config.discordWebhookUrl as string
  if (!webhookUrl) return

  const top = params.standings.slice(0, 10)
  const description = top
    .map(s => {
      const medal = s.placement === 1 ? '🥇' : s.placement === 2 ? '🥈' : s.placement === 3 ? '🥉' : `${s.placement}.`
      return `${medal} **${s.playerName}** — ${s.points} punti`
    })
    .join('\n')

  const payload = {
    embeds: [
      {
        title: `🏆 Torneo finalizzato: ${params.tournamentName}`,
        description,
        color: 0xf59e0b,
        fields: [
          { name: 'Lega', value: params.leagueName, inline: true },
          { name: 'Data', value: params.tournamentDate, inline: true },
        ],
        footer: { text: 'League Manager · Weiss Schwarz' },
      },
    ],
  }

  try {
    await $fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    console.log(`[Discord] Notifica inviata per: ${params.tournamentName}`)
  } catch (e) {
    console.error('[Discord] Invio webhook fallito:', e)
    // Non-fatal — do not throw
  }
}
