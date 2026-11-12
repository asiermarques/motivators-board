// The UI strings shipped with the app, by Locale. An Adopter overrides any of them, or translates them all for a
// Locale that is not shipped, in the Configuration (i18n/<locale>.yml). No UI or i18n library is imported here, so the
// Configuration check can use it.

export interface UiStrings {
  [key: string]: string | UiStrings;
}

export const SHIPPED_STRINGS = {
  en: {
    board: {
      label: "Your Board, from least to most important",
      least: "Least important",
      most: "Most important",
      moves: "Moves",
      moved: "{{title}} moved to position {{position}} of {{count}}.",
      instructions:
        "Drag the card, or press the up and down arrows to move it: up makes it more important. Home or End sends it to an end. Drag it sideways, or press the left and right arrows, to say whether it is met: right is met, left is not met, the centre is neither. Press Enter to flip it.",
      met: "{{title}} is met.",
      unmet: "{{title}} is not met.",
      centred: "{{title}} is back in the centre: neither met nor unmet.",
      pickedUp: "Picked up {{title}}.",
      cancelled: "{{title}} was put back.",
    },
    fulfilment: {
      met: "Met",
      unmet: "Unmet",
    },
    summary: {
      label: "Summary",
      most: "Most motivating",
      least: "Least motivating",
      empty: "Move the cards until the order feels right: what motivates you most and least will appear here.",
    },
    person: {
      name: "Your name",
    },
    share: {
      copy: "Copy link",
      copied: "Link copied",
      failed: "Copy the address from the address bar",
    },
    notice: {
      label: "About this link",
      ignored: "Ignored from the link: {{list}}.",
      added: "Added at the end: {{list}}.",
      locale: 'The language "{{locale}}" is not available, so the default one is used.',
      parameters: "Unknown parts of the link were ignored: {{list}}.",
      fulfilmentIgnored: "Ignored from met and unmet: {{list}}.",
      fulfilmentBoth: "Listed as both met and unmet, so neither: {{list}}.",
      dismiss: "Dismiss",
    },
  },
} satisfies Record<string, UiStrings>;

export const SHIPPED_LOCALE = "en";
