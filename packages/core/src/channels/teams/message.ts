import type {
  TeamsActivity,
  TeamsMessage,
  TeamsAdaptiveCard,
  TeamsAdaptiveCardElement,
  TeamsAdaptiveCardAction,
  TeamsTextBlock,
  TeamsContainer,
  TeamsColumnSet,
  TeamsColumn,
  TeamsImage,
  TeamsFactSet,
  TeamsFact,
  TeamsInput,
  TeamsChoice,
  TeamsMention,
  TeamsConversation,
  TeamsChannelData,
} from "./types.js";

export class TeamsMessageHandler {
  private accessToken: string | null = null;
  private baseUrl = "https://smba.trafficmanager.net/teams/v3.0";

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  setServiceUrl(serviceUrl: string): void {
    this.baseUrl = serviceUrl;
  }

  async sendText(
    conversationId: string,
    text: string,
    options?: {
      replyToId?: string;
      mentions?: TeamsMention[];
    },
  ): Promise<{ id: string }> {
    this.ensureAccessToken();

    const response = await fetch(`${this.baseUrl}/conversations/${conversationId}/activities`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "message",
        text,
        ...(options?.replyToId && { replyToId: options.replyToId }),
        ...(options?.mentions && {
          entities: options.mentions.map((mention) => ({
            type: "mention",
            text: mention.text,
            mentioned: mention.mentioned,
          })),
        }),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Failed to send message: ${(error as { error?: { message?: string } })?.error?.message ?? response.statusText}`,
      );
    }

    return response.json() as Promise<{ id: string }>;
  }

  async sendCard(
    conversationId: string,
    card: TeamsAdaptiveCard,
    options?: {
      replyToId?: string;
    },
  ): Promise<{ id: string }> {
    this.ensureAccessToken();

    const response = await fetch(`${this.baseUrl}/conversations/${conversationId}/activities`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: card,
          },
        ],
        ...(options?.replyToId && { replyToId: options.replyToId }),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Failed to send card: ${(error as { error?: { message?: string } })?.error?.message ?? response.statusText}`,
      );
    }

    return response.json() as Promise<{ id: string }>;
  }

  async sendReply(
    conversationId: string,
    threadId: string,
    text: string,
  ): Promise<{ id: string }> {
    return this.sendText(conversationId, text, { replyToId: threadId });
  }

  async deleteMessage(conversationId: string, activityId: string): Promise<void> {
    this.ensureAccessToken();

    const response = await fetch(
      `${this.baseUrl}/conversations/${conversationId}/activities/${activityId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      },
    );

    if (!response.ok && response.status !== 404) {
      const error = await response.json();
      throw new Error(
        `Failed to delete message: ${(error as { error?: { message?: string } })?.error?.message ?? response.statusText}`,
      );
    }
  }

  async getMessage(conversationId: string, messageId: string): Promise<TeamsMessage | null> {
    this.ensureAccessToken();

    const response = await fetch(
      `${this.baseUrl}/conversations/${conversationId}/activities/${messageId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      },
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Failed to get message: ${(error as { error?: { message?: string } })?.error?.message ?? response.statusText}`,
      );
    }

    return response.json() as Promise<TeamsMessage>;
  }

  parseWebhookEvent(body: Record<string, unknown>): TeamsActivity {
    return body as unknown as TeamsActivity;
  }

  isValidWebhook(activity: TeamsActivity, verificationToken?: string): boolean {
    if (!verificationToken) {
      return true;
    }
    // Teams uses different verification mechanism (Channel Verification)
    // This is a simplified check
    return activity.serviceUrl !== undefined;
  }

  extractTextFromMessage(activity: TeamsActivity): string {
    if (activity.text) {
      return activity.text;
    }

    if (activity.attachments) {
      for (const attachment of activity.attachments) {
        if (attachment.contentType === "application/vnd.microsoft.card.adaptive") {
          const card = attachment.content as TeamsAdaptiveCard;
          return this.extractTextFromCard(card);
        }
      }
    }

    return "";
  }

  private extractTextFromCard(card: TeamsAdaptiveCard): string {
    if (!card.body) return "";

    for (const element of card.body) {
      if (element.type === "TextBlock") {
        const textBlock = element as TeamsTextBlock;
        return textBlock.text;
      }
    }

    return "";
  }

  extractTextBlocks(card: TeamsAdaptiveCard): TeamsTextBlock[] {
    const textBlocks: TeamsTextBlock[] = [];

    for (const element of card.body) {
      if (element.type === "TextBlock") {
        textBlocks.push(element as TeamsTextBlock);
      }
    }

    return textBlocks;
  }

  parseMention(activity: TeamsActivity): TeamsMention | null {
    if (activity.entities && activity.entities.length > 0) {
      for (const entity of activity.entities) {
        if (
          typeof entity === "object" &&
          entity !== null &&
          "type" in entity &&
          entity.type === "mention"
        ) {
          return entity as unknown as TeamsMention;
        }
      }
    }
    return null;
  }

  getConversationId(activity: TeamsActivity): string {
    return activity.conversation?.id ?? "";
  }

  getUserId(activity: TeamsActivity): string {
    return activity.from.aadObjectId ?? activity.from.id;
  }

  getMessageId(activity: TeamsActivity): string {
    return activity.id;
  }

  getTimestamp(activity: TeamsActivity): number {
    return new Date(activity.timestamp).getTime();
  }

  getChannelData(activity: TeamsActivity): TeamsChannelData | undefined {
    return activity.channelData;
  }

  isFromChannel(activity: TeamsActivity): boolean {
    return activity.channelData?.channel !== undefined;
  }

  isFromGroupChat(activity: TeamsActivity): boolean {
    return activity.conversation?.conversationType === "groupChat";
  }

  isFromTeam(activity: TeamsActivity): boolean {
    return activity.channelData?.team !== undefined;
  }

  getTeamId(activity: TeamsActivity): string | undefined {
    return activity.channelData?.team?.id;
  }

  getChannelId(activity: TeamsActivity): string | undefined {
    return activity.channelData?.channel?.id;
  }

  private ensureAccessToken(): void {
    if (!this.accessToken) {
      throw new Error("Access token not set. Call setAccessToken first.");
    }
  }
}

export function createMessageHandler(): TeamsMessageHandler {
  return new TeamsMessageHandler();
}

// Card Builder for Teams Adaptive Cards
export class TeamsCardBuilder {
  private card: TeamsAdaptiveCard;
  private currentSectionIndex: number = 0;

  constructor() {
    this.card = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [],
      actions: [],
    };
  }

  setId(cardId: string): this {
    this.card.id = cardId;
    return this;
  }

  setMsteamsProps(props: { rootElementId?: string; channelData?: TeamsChannelData }): this {
    this.card.msteams = {
      teamsx: props.rootElementId ? { rootElementId: props.rootElementId } : undefined,
      channelData: props.channelData,
    };
    return this;
  }

  addTextBlock(
    text: string,
    options?: {
      weight?: "bolder" | "lighter" | "normal";
      size?: "extraLarge" | "large" | "medium" | "small" | "default";
      color?: "accent" | "attention" | "default" | "good" | "warning";
      isSubtle?: boolean;
      wrap?: boolean;
      horizontalAlignment?: "center" | "left" | "right";
    },
  ): this {
    const textBlock: TeamsTextBlock = {
      type: "TextBlock",
      text,
      ...options,
    };
    this.card.body.push(textBlock);
    return this;
  }

  addContainer(
    items: TeamsAdaptiveCardElement[],
    options?: {
      style?: string;
      verticalContentAlignment?: "center" | "top" | "bottom";
      horizontalAlignment?: "center" | "left" | "right";
    },
  ): this {
    const container: TeamsContainer = {
      type: "Container",
      items,
      ...options,
    };
    this.card.body.push(container);
    return this;
  }

  addColumnSet(columns: TeamsColumn[]): this {
    const columnSet: TeamsColumnSet = {
      type: "ColumnSet",
      columns,
    };
    this.card.body.push(columnSet);
    return this;
  }

  addImage(
    url: string,
    options?: {
      altText?: string;
      size?: "auto" | "stretch" | "small" | "medium" | "large";
      horizontalAlignment?: "center" | "left" | "right";
      style?: "person" | "default";
    },
  ): this {
    const image: TeamsImage = {
      type: "Image",
      url,
      ...options,
    };
    this.card.body.push(image);
    return this;
  }

  addFactSet(facts: TeamsFact[]): this {
    const factSet: TeamsFactSet = {
      type: "FactSet",
      facts,
    };
    this.card.body.push(factSet);
    return this;
  }

  addInput(input: TeamsInput): this {
    this.card.body.push(input);
    return this;
  }

  addTextInput(
    id: string,
    label: string,
    options?: {
      placeholder?: string;
      isRequired?: boolean;
      isMultiline?: boolean;
      maxLength?: number;
    },
  ): this {
    const input: TeamsInput = {
      type: "TextInput",
      id,
      label,
      ...options,
    };
    return this.addInput(input);
  }

  addChoiceSet(
    id: string,
    label: string,
    choices: TeamsChoice[],
    options?: {
      isMultiSelect?: boolean;
      isRequired?: boolean;
    },
  ): this {
    const input: TeamsInput = {
      type: "ChoiceSet",
      id,
      label,
      choices,
      ...options,
    };
    return this.addInput(input);
  }

  addAction(action: TeamsAdaptiveCardAction): this {
    this.card.actions?.push(action);
    return this;
  }

  addSubmitButton(
    title: string,
    data?: string | Record<string, unknown>,
    options?: { isPrimary?: boolean },
  ): this {
    return this.addAction({
      type: "Action.Submit",
      title,
      data,
      isPrimary: options?.isPrimary,
    });
  }

  addOpenUrlButton(
    title: string,
    url: string,
    options?: { isPrimary?: boolean },
  ): this {
    return this.addAction({
      type: "Action.OpenUrl",
      title,
      url,
      isPrimary: options?.isPrimary,
    });
  }

  addExecuteButton(
    title: string,
    verb: string,
    data?: Record<string, unknown>,
    options?: { isPrimary?: boolean },
  ): this {
    return this.addAction({
      type: "Action.Execute",
      title,
      verb,
      data,
      isPrimary: options?.isPrimary,
    });
  }

  build(): TeamsAdaptiveCard {
    return { ...this.card };
  }
}

export function createCardBuilder(): TeamsCardBuilder {
  return new TeamsCardBuilder();
}

export function createAlertCard(
  title: string,
  message: string,
  type: "info" | "warning" | "error" | "success",
): TeamsAdaptiveCard {
  const colorMap: Record<string, "accent" | "warning" | "attention" | "good"> = {
    info: "accent",
    warning: "warning",
    error: "attention",
    success: "good",
  };

  return new TeamsCardBuilder()
    .addTextBlock(title, { weight: "bolder", size: "large" })
    .addTextBlock(message, { color: colorMap[type], isSubtle: true })
    .build();
}

export function createConfirmationCard(
  title: string,
  message: string,
  confirmText: string,
  cancelText: string,
  confirmVerb: string,
  cancelVerb?: string,
): TeamsAdaptiveCard {
  const builder = new TeamsCardBuilder();
  builder.addTextBlock(title, { weight: "bolder", size: "large" });
  builder.addTextBlock(message);
  builder.addAction({
    type: "Action.Execute",
    title: confirmText,
    verb: confirmVerb,
    isPrimary: true,
  });
  builder.addAction({
    type: "Action.Execute",
    title: cancelText,
    verb: cancelVerb ?? "cancel",
  });
  return builder.build();
}
