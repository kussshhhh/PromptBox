// background.js
chrome.runtime.onInstalled.addListener(() => {
  const defaultPrompts = {
    global: [
      { id: 'g1', text: "Could you explain this in simple terms?", type: 'global' },
      { id: 'g2', text: "What are the pros and cons of this approach?", type: 'global' },
      { id: 'g3', text: "Can you provide an example?", type: 'global' }
    ],
    local: [
      { id: 'l1', text: "What does this code do?", type: 'local' },
      { id: 'l2', text: "How can I improve this?", type: 'local' }
    ]
  };

  chrome.storage.sync.set({
    prompts: defaultPrompts,
    position: { x: window.innerWidth - 80, y: 20 },
    isExpanded: true,
    activeTab: 'local'
  });
});