/**
 * RP-2.7 generic-shell vocabulary. Legal/container semantics deliberately live
 * outside this module so a future tenant lexicon cannot leak into chrome.
 */
export const CHROME_COPY = {
  segment: {
    chat: 'Chat',
    work: 'Work',
  },
  storeChat: {
    action: 'Save to a case',
    title: 'Save this chat',
    body: 'Store the current conversation into a case or workspace to keep working with structure.',
  },
  navigation: {
    output: 'Output',
    scheduled: 'Scheduled',
    dispatch: 'Dispatch',
    newCase: 'New case',
    pinned: 'Pinned',
    recent: 'Recent',
    expandLeft: 'Expand sidebar',
    collapseLeft: 'Collapse sidebar',
  },
  welcome: {
    eyebrow: 'New work',
    title: 'Start a task',
    body: 'Describe what you need to handle. Courtwork will build the working context with you.',
    sample: 'Get started with the sample case',
    slogan: 'Where should we start?',
    ideasLabel: 'Ideas for you',
  },
  composer: {
    add: 'Add',
    attachFiles: 'Attach files',
    addFolder: 'Add folder',
    takePhoto: 'Take a photo or scan',
    voiceInput: 'Voice input',
    chooseCase: 'Choose case',
    unbound: 'No case · start unfiled',
    placeholder: 'Describe a task or ask anything…',
    inputLabel: 'Message',
    send: 'Send',
    newLine: 'New line',
    connect: 'Connect',
    connectionFailed: 'Connection failed',
    standard: 'Standard',
    deep: 'Deep',
  },
  utility: {
    progress: 'Progress',
    workingFolders: 'Working folders',
    context: 'Context',
    preview: 'Preview',
    open: 'Open',
  },
  account: {
    owner: 'Owner',
    sampleLead: 'Sample lead',
    settingsUpdates: 'Settings & updates',
    feedback: 'Give us feedback',
  },
} as const;
