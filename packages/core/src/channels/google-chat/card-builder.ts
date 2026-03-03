import type {
  GoogleChatCardV2,
  GoogleChatCard,
  GoogleChatCardHeader,
  GoogleChatCardSection,
  GoogleChatWidget,
  GoogleChatTextParagraph,
  GoogleChatImage,
  GoogleChatKeyValue,
  GoogleChatButtonList,
  GoogleChatButton,
  GoogleChatTextInput,
  GoogleChatSelectionInput,
  GoogleChatDecoratedText,
  GoogleChatGrid,
  GoogleChatIcon,
  GoogleChatOnClick,
  GoogleChatChoice,
  GoogleChatDateTimePicker,
  GoogleChatBorderStyle,
  GoogleChatColor,
  GoogleChatGridColumn,
} from "./types.js";

export class CardBuilder {
  private cardId: string;
  private header?: GoogleChatCardHeader;
  private sections: GoogleChatCardSection[] = [];
  private currentSectionIndex: number = -1;

  constructor(cardId: string = "card1") {
    this.cardId = cardId;
  }

  setHeader(title: string, subtitle?: string, imageUrl?: string): CardBuilder {
    this.header = {
      title,
      subtitle,
      imageUrl,
      imageStyle: "AVATAR",
    };
    return this;
  }

  addSection(header?: string, collapsible?: boolean): CardBuilder {
    const section: GoogleChatCardSection = {
      header,
      widgets: [],
      collapsible,
    };
    this.sections.push(section);
    this.currentSectionIndex = this.sections.length - 1;
    return this;
  }

  addTextParagraph(text: string): CardBuilder {
    const widget: GoogleChatWidget = {
      textParagraph: {
        text,
      },
    };
    this.addWidget(widget);
    return this;
  }

  addImage(imageUrl: string, onClick?: GoogleChatOnClick): CardBuilder {
    const widget: GoogleChatWidget = {
      image: {
        imageUrl,
        onClick,
        aspectRatio: 1.0,
      },
    };
    this.addWidget(widget);
    return this;
  }

  addKeyValue(
    content: string,
    options?: {
      topLabel?: string;
      bottomLabel?: string;
      startIcon?: GoogleChatIcon;
      endIcon?: GoogleChatIcon;
      button?: GoogleChatButton;
      onClick?: GoogleChatOnClick;
    },
  ): CardBuilder {
    const widget: GoogleChatWidget = {
      keyValue: {
        content,
        topLabel: options?.topLabel,
        bottomLabel: options?.bottomLabel,
        startIcon: options?.startIcon,
        endIcon: options?.endIcon,
        button: options?.button,
        onClick: options?.onClick,
      },
    };
    this.addWidget(widget);
    return this;
  }

  addDecoratedText(text: string, options?: {
    startIcon?: GoogleChatIcon;
    endIcon?: GoogleChatIcon;
    button?: GoogleChatButton;
    onClick?: GoogleChatOnClick;
  }): CardBuilder {
    const widget: GoogleChatWidget = {
      decoratedText: {
        text,
        startIcon: options?.startIcon,
        endIcon: options?.endIcon,
        button: options?.button,
        onClick: options?.onClick,
      },
    };
    this.addWidget(widget);
    return this;
  }

  addButtons(buttons: GoogleChatButton[]): CardBuilder {
    const widget: GoogleChatWidget = {
      buttonList: {
        buttons,
      },
    };
    this.addWidget(widget);
    return this;
  }

  addButton(
    text: string,
    onClick: GoogleChatOnClick,
    icon?: GoogleChatIcon,
  ): CardBuilder {
    const button: GoogleChatButton = {
      text,
      onClick,
      icon,
    };
    return this.addButtons([button]);
  }

  addTextInput(
    label: string,
    options?: {
      type?: string;
      hintText?: string;
      value?: string;
      onChangeAction?: string;
    },
  ): CardBuilder {
    const widget: GoogleChatWidget = {
      textInput: {
        label,
        type: options?.type ?? "STRING",
        hintText: options?.hintText,
        value: options?.value,
        onChangeAction: options?.onChangeAction,
      },
    };
    this.addWidget(widget);
    return this;
  }

  addSelectionInput(
    label: string,
    type: "CHECK_BOX" | "RADIO_BUTTON" | "SWITCH" | "DROPDOWN",
    choices: GoogleChatChoice[],
    options?: {
      onChangeAction?: string;
    },
  ): CardBuilder {
    const widget: GoogleChatWidget = {
      selectionInput: {
        label,
        type,
        items: choices,
        onChangeAction: options?.onChangeAction,
      },
    };
    this.addWidget(widget);
    return this;
  }

  addDateTimePicker(
    label: string,
    options?: {
      type?: "DATE_AND_TIME" | "DATE" | "TIME";
      valueMsEpoch?: number;
      onChangeAction?: string;
    },
  ): CardBuilder {
    const widget: GoogleChatWidget = {
      dateTimePicker: {
        label,
        type: options?.type ?? "DATE_AND_TIME",
        valueMsEpoch: options?.valueMsEpoch,
        onChangeAction: options?.onChangeAction,
      },
    };
    this.addWidget(widget);
    return this;
  }

  addDivider(): CardBuilder {
    const widget: GoogleChatWidget = {
      divider: {},
    };
    this.addWidget(widget);
    return this;
  }

  addGrid(
    columns: GoogleChatGridColumn[],
    options?: {
      title?: string;
      columnCount?: number;
      borderStyle?: GoogleChatBorderStyle;
    },
  ): CardBuilder {
    const widget: GoogleChatWidget = {
      grid: {
        title: options?.title,
        columnCount: options?.columnCount ?? columns.length,
        borderStyle: options?.borderStyle,
        columns,
      },
    };
    this.addWidget(widget);
    return this;
  }

  addWidget(widget: GoogleChatWidget): CardBuilder {
    if (this.currentSectionIndex === -1) {
      this.addSection();
    }

    this.sections[this.currentSectionIndex].widgets?.push(widget);
    return this;
  }

  build(): GoogleChatCardV2 {
    const card: GoogleChatCard = {};

    if (this.header) {
      card.header = this.header;
    }

    if (this.sections.length > 0) {
      card.sections = this.sections;
    }

    return {
      cardId: this.cardId,
      card,
    };
  }

  buildAll(): GoogleChatCardV2[] {
    return [this.build()];
  }

  static create(cardId?: string): CardBuilder {
    return new CardBuilder(cardId);
  }

  static createFromCard(card: GoogleChatCard, cardId?: string): CardBuilder {
    const builder = new CardBuilder(cardId ?? "card1");
    
    if (card.header) {
      builder.header = card.header;
    }

    if (card.sections) {
      builder.sections = card.sections;
    }

    return builder;
  }

  static createAlert(
    title: string,
    message: string,
    severity: "info" | "warning" | "error" | "success" = "info",
  ): GoogleChatCardV2 {
    const icons: Record<string, string> = {
      info: "INFO",
      warning: "WARNING",
      error: "ERROR",
      success: "STAR",
    };

    return new CardBuilder()
      .setHeader(title)
      .addDecoratedText(message, {
        startIcon: {
          knownIcon: icons[severity],
        },
      })
      .build();
  }

  static createConfirmation(
    title: string,
    message: string,
    confirmText: string,
    cancelText: string,
    onConfirm: string,
    onCancel: string,
  ): GoogleChatCardV2 {
    return new CardBuilder()
      .setHeader(title)
      .addTextParagraph(message)
      .addButtons([
        {
          text: cancelText,
          onClick: {
            action: {
              function: onCancel,
              persist: false,
            },
          },
        },
        {
          text: confirmText,
          onClick: {
            action: {
              function: onConfirm,
              persist: false,
            },
          },
        },
      ])
      .build();
  }

  static createForm(
    title: string,
    fields: Array<{
      label: string;
      type: "text" | "select" | "date";
      hint?: string;
      options?: string[];
    }>,
    submitAction: string,
  ): GoogleChatCardV2 {
    const builder = new CardBuilder().setHeader(title);

    for (const field of fields) {
      if (field.type === "select" && field.options) {
        builder.addSelectionInput(
          field.label,
          "DROPDOWN",
          field.options.map((opt) => ({ value: opt, label: opt })),
          { onChangeAction: submitAction },
        );
      } else if (field.type === "date") {
        builder.addDateTimePicker(field.label, { onChangeAction: submitAction });
      } else {
        builder.addTextInput(field.label, {
          hintText: field.hint,
          onChangeAction: submitAction,
        });
      }
    }

    return builder
      .addButton("Submit", {
        action: {
          function: submitAction,
          persist: true,
        },
      })
      .build();
  }
}

export function createCardBuilder(cardId?: string): CardBuilder {
  return CardBuilder.create(cardId);
}

export function createAlertCard(
  title: string,
  message: string,
  severity: "info" | "warning" | "error" | "success" = "info",
): GoogleChatCardV2 {
  return CardBuilder.createAlert(title, message, severity);
}

export function createConfirmationCard(
  title: string,
  message: string,
  confirmText: string,
  cancelText: string,
  onConfirm: string,
  onCancel: string,
): GoogleChatCardV2 {
  return CardBuilder.createConfirmation(title, message, confirmText, cancelText, onConfirm, onCancel);
}
