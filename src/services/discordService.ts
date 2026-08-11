/**
 * Discord Webhook Service
 * Handles sending professional notifications to Discord when employees change service status
 */

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title: string;
  description?: string;
  color: number;
  fields?: DiscordEmbedField[];
  timestamp: string;
  footer?: {
    text: string;
    icon_url?: string;
  };
  author?: {
    name: string;
    icon_url?: string;
  };
}

interface DiscordWebhookPayload {
  embeds: DiscordEmbed[];
}

/**
 * Sends a service status change notification to Discord
 * @param employeeName - Name of the employee
 * @param isOnService - New service status (true = in service, false = out of service)
 * @param employeeRole - Role of the employee
 * @param webhookUrl - Discord webhook URL (optional, uses env var if not provided)
 */
export const sendServiceStatusNotification = async (
  employeeName: string,
  isOnService: boolean,
  employeeRole: string,
  webhookUrl?: string
): Promise<boolean> => {
  try {
    const url = webhookUrl || import.meta.env.VITE_DISCORD_WEBHOOK_URL;
    
    if (!url) {
      console.warn('Discord webhook URL not configured');
      return false;
    }

    const now = new Date().toISOString();
    const statusText = isOnService ? 'IN SERVIZIO' : 'FUORI SERVIZIO';
    const statusEmoji = isOnService ? '🟢' : '🔴';
    const actionText = isOnService ? 'entrato in servizio' : 'uscito dal servizio';
    
    // Color coding: Green for in service, Red for out of service
    const embedColor = isOnService ? 0x00ff00 : 0xff0000;
    
    // Role labels in Italian
    const roleLabels: Record<string, string> = {
      owner: 'Proprietario',
      director: 'Direttore',
      vice_director: 'Vice Direttore',
      employee: 'Dipendente',
      probation: 'In Prova'
    };

    const embed: DiscordEmbed = {
      title: `${statusEmoji} Cambio Stato Servizio`,
      description: `**${employeeName}** è ${actionText}`,
      color: embedColor,
      fields: [
        {
          name: '👤 Dipendente',
          value: employeeName,
          inline: true
        },
        {
          name: '🏷️ Ruolo',
          value: roleLabels[employeeRole] || employeeRole,
          inline: true
        },
        {
          name: '🏢 Concessionario',
          value: 'Aurum Motors',
          inline: true
        },
        {
          name: '📊 Stato',
          value: `${statusEmoji} **${statusText}**`,
          inline: false
        },
        {
          name: '🕐 Orario',
          value: new Date().toLocaleString('it-IT', {
            timeZone: 'Europe/Rome',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          inline: false
        }
      ],
      timestamp: now,
      footer: {
        text: 'Aurum Motors - Gestionale Concessionario',
        icon_url: 'https://cdn.discordapp.com/attachments/placeholder/icon.png'
      },
      author: {
        name: 'Sistema Gestione Dipendenti',
        icon_url: 'https://cdn.discordapp.com/attachments/placeholder/system-icon.png'
      }
    };

    const payload: DiscordWebhookPayload = {
      embeds: [embed]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`);
    }

    console.log(`✅ Discord notification sent: ${employeeName} ${actionText}`);
    return true;

  } catch (error) {
    console.error('❌ Failed to send Discord notification:', error);
    return false;
  }
};

/**
 * Test function to verify Discord webhook connectivity
 * @param webhookUrl - Discord webhook URL to test
 */
export const testDiscordWebhook = async (webhookUrl?: string): Promise<boolean> => {
  try {
    const url = webhookUrl || import.meta.env.VITE_DISCORD_WEBHOOK_URL;
    
    if (!url) {
      console.error('Discord webhook URL not configured');
      return false;
    }

    const testEmbed: DiscordEmbed = {
      title: '🧪 Test Connessione',
      description: 'Test di connettività del webhook Discord',
      color: 0x0099ff,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Test System'
      }
    };

    const payload: DiscordWebhookPayload = {
      embeds: [testEmbed]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Test failed: ${response.status} ${response.statusText}`);
    }

    console.log('✅ Discord webhook test successful');
    return true;

  } catch (error) {
    console.error('❌ Discord webhook test failed:', error);
    return false;
  }
};
